-- TAREFA 1: Encontrar e remover subscriptions órfãs
-- 1. Primeiro inspecione quantas existem:
-- SELECT count(*) FROM push_subscriptions WHERE user_type = 'DRIVER' AND driver_id IS NOT NULL AND driver_id NOT IN (SELECT id FROM drivers);

-- 2. Remova as órfãs:
DELETE FROM push_subscriptions 
WHERE user_type = 'DRIVER' 
  AND driver_id IS NOT NULL 
  AND driver_id NOT IN (SELECT id FROM drivers);

-- 3. Adicionar constraint de Foreign Key com ON DELETE CASCADE:
-- Se a constraint fk_push_subscriptions_driver_id já existir (sem cascade), remova antes.
-- ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS fk_push_subscriptions_driver_id;

ALTER TABLE push_subscriptions
ADD CONSTRAINT fk_push_subscriptions_driver_id
FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE;
