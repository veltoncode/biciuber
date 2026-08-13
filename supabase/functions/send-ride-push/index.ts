import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";
import webPush from "npm:web-push@3.6.7";

// Definição das mensagens
const messages = {
  "pt-BR": {
    "NEW_RIDE": { title: "Nova corrida no BiciTaxi", body: "Há uma nova solicitação disponível." },
    "RIDE_ACCEPTED": { title: "Bicitáxi encontrado", body: "Um bicitaxista aceitou sua solicitação." },
    "DRIVER_ARRIVING": { title: "Bicitaxista a caminho", body: "Seu bicitaxista está a caminho." },
    "DRIVER_ARRIVED": { title: "O bicitaxista chegou", body: "Seu bicitaxista está aguardando no local." },
    "RIDE_CANCELLED": { title: "Corrida cancelada", body: "O passageiro cancelou a corrida." },
    "RIDE_COMPLETED": { title: "Corrida concluída", body: "Sua corrida foi concluída." }
  },
  "en": {
    "NEW_RIDE": { title: "New BiciTaxi Request", body: "There is a new ride request available." },
    "RIDE_ACCEPTED": { title: "Driver Found", body: "A driver has accepted your request." },
    "DRIVER_ARRIVING": { title: "Driver Arriving", body: "Your driver is on the way." },
    "DRIVER_ARRIVED": { title: "Driver Arrived", body: "Your driver is waiting at the location." },
    "RIDE_CANCELLED": { title: "Ride Cancelled", body: "The passenger cancelled the ride." },
    "RIDE_COMPLETED": { title: "Ride Completed", body: "Your ride is completed." }
  },
  "fr": {
    "NEW_RIDE": { title: "Nouvelle course BiciTaxi", body: "Une nouvelle demande est disponible." },
    "RIDE_ACCEPTED": { title: "Chauffeur trouvé", body: "Un chauffeur a accepté votre demande." },
    "DRIVER_ARRIVING": { title: "Chauffeur en route", body: "Votre chauffeur est en route." },
    "DRIVER_ARRIVED": { title: "Chauffeur arrivé", body: "Votre chauffeur attend sur place." },
    "RIDE_CANCELLED": { title: "Course annulée", body: "Le passager a annulé la course." },
    "RIDE_COMPLETED": { title: "Course terminée", body: "Votre course est terminée." }
  }
};

serve(async (req) => {
  try {
    // Validação de Segredo do Webhook (prevenir chamadas externas não autorizadas)
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    const authHeader = req.headers.get("authorization");
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { type, record, old_record } = body; // Database Webhook Payload

    if (!record) {
      return new Response("No record found", { status: 400 });
    }

    let eventType = null;

    // Detectar qual é a mudança de estado baseada no payload do webhook
    if (type === "INSERT" && record.status === "REQUESTED") {
      eventType = "NEW_RIDE";
    } else if (type === "UPDATE") {
      if (old_record.status === "REQUESTED" && record.status === "ACCEPTED") {
        eventType = "RIDE_ACCEPTED";
      } else if (old_record.status === "ACCEPTED" && record.status === "DRIVER_ARRIVING") {
        eventType = "DRIVER_ARRIVING";
      } else if (old_record.status === "DRIVER_ARRIVING" && record.status === "DRIVER_ARRIVED") {
        eventType = "DRIVER_ARRIVED";
      } else if (old_record.status !== "CANCELLED" && record.status === "CANCELLED" && record.driver_id) {
        eventType = "RIDE_CANCELLED"; // Motorista precisa ser avisado pois ele tinha assumido a corrida
      } else if (old_record.status !== "COMPLETED" && record.status === "COMPLETED") {
        eventType = "RIDE_COMPLETED";
      }
    }

    if (!eventType) {
      // Mudança irrelevante para push
      return new Response("Ignored", { status: 200 });
    }

    // Configuração Supabase Service Role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Configuração Web Push
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");

    if (!vapidPublic || !vapidPrivate || !vapidSubject) {
      console.error("VAPID keys not configured in Edge Function envs.");
      return new Response("VAPID not configured", { status: 500 });
    }

    webPush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    let query = supabaseClient.from("push_subscriptions").select("*").eq("is_active", true);

    // Filtrar destinatários adequados
    if (eventType === "NEW_RIDE") {
      const { data: availableDrivers } = await supabaseClient
        .from("drivers")
        .select("id")
        .eq("is_available", true);

      if (!availableDrivers || availableDrivers.length === 0) {
        return new Response("No available drivers", { status: 200 });
      }

      const availableDriverIds = availableDrivers.map((d: any) => d.id);

      const { data: busyRides } = await supabaseClient
        .from("rides")
        .select("driver_id")
        .in("status", ["ACCEPTED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "IN_PROGRESS"])
        .not("driver_id", "is", null);

      const busyDriverIds = busyRides ? busyRides.map((r: any) => r.driver_id) : [];
      const eligibleDriverIds = availableDriverIds.filter((id: string) => !busyDriverIds.includes(id));

      if (eligibleDriverIds.length === 0) {
        return new Response("All drivers are busy", { status: 200 });
      }

      query = query.eq("user_type", "DRIVER").not("driver_id", "is", null).in("driver_id", eligibleDriverIds);
    } else if (eventType === "RIDE_CANCELLED") {
      query = query.eq("user_type", "DRIVER").eq("driver_id", record.driver_id);
    } else {
      // Eventos voltados ao passageiro (ACCEPTED, ARRIVING, ARRIVED, COMPLETED)
      query = query.eq("user_type", "PASSENGER").eq("passenger_ride_id", record.id);
    }

    const { data: subscriptions, error } = await query;

    if (error || !subscriptions || subscriptions.length === 0) {
      return new Response("No target subscriptions", { status: 200 });
    }

    const promises = subscriptions.map(async (sub) => {
      const lang = messages[sub.language] ? sub.language : "pt-BR";
      const { title, body } = messages[lang][eventType];

      const payload = JSON.stringify({
        title,
        body,
        icon: "/icons/bicitaxi-afua-transparent.png",
        tag: `ride-${record.id}-${eventType}`, // evita repetições do mesmo status na tela
        data: {
          url: "/",
          rideId: record.id,
          type: eventType
        }
      });

      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webPush.sendNotification(pushSub, payload);
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`Endpoint expirado: ${sub.endpoint}`);
          await supabaseClient
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        } else {
          console.error("Erro ao enviar push:", err);
        }
      }
    });

    await Promise.all(promises);

    return new Response(JSON.stringify({ success: true, count: promises.length }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("Erro interno na Edge Function:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
