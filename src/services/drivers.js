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
  const { data, error } = await supabase.rpc("get_available_drivers");

  if (error) {
    console.error("Erro ao buscar motoristas disponíveis via RPC:", error);
    throw error;
  }

  return data || [];
}

export async function driverLogin(phone, pin) {
  const { data, error } = await supabase.rpc("driver_login", {
    p_phone: phone,
    p_pin: pin
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function adminApproveDriver(driverId, pin, adminSecret) {
  const { error } = await supabase.rpc("admin_approve_driver", {
    p_driver_id: driverId,
    p_pin: pin,
    p_admin_secret: adminSecret
  });
  if (error) throw error;
}
