import { supabase } from "../lib/supabaseClient";

/**
 * Consulta os motoristas disponíveis (is_available = true) e que não possuem
 * uma corrida ativa (status ACCEPTED, DRIVER_ARRIVING, DRIVER_ARRIVED, IN_PROGRESS).
 *
 * NOTA: Esta filtragem local (consultar drivers e depois corridas) é provisória e
 * aceitável para o volume atual de dados. Se a base de motoristas crescer significativamente,
 * será ideal migrar para uma View ou RPC no Supabase para retornar os motoristas já filtrados.
 *
 * @returns {Promise<Array>} Lista de motoristas disponíveis.
 */
export async function getAvailableDrivers() {
  // 1. Buscar todos os motoristas marcados como disponíveis (is_available = true)
  const { data: drivers, error: driversError } = await supabase
    .from("drivers")
    .select("id, name, phone, plate, is_available")
    .eq("is_available", true);

  if (driversError) {
    console.error("Erro ao buscar motoristas disponíveis:", driversError);
    throw driversError;
  }

  if (!drivers || drivers.length === 0) {
    return [];
  }

  const driverIds = drivers.map((d) => d.id);

  // 2. Buscar todas as corridas ativas associadas a qualquer motorista da lista
  const { data: activeRides, error: ridesError } = await supabase
    .from("rides")
    .select("driver_id, status")
    .in("driver_id", driverIds)
    .in("status", ["ACCEPTED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "IN_PROGRESS"]);

  if (ridesError) {
    console.error("Erro ao buscar corridas ativas:", ridesError);
    throw ridesError;
  }

  // 3. Filtrar os motoristas: manter apenas aqueles cujo ID não está na lista de corridas ativas
  const busyDriverIds = new Set((activeRides || []).map((r) => r.driver_id));
  
  const trulyAvailableDrivers = drivers.filter((d) => !busyDriverIds.has(d.id));

  return trulyAvailableDrivers;
}
