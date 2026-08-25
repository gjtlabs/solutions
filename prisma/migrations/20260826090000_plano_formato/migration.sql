-- El alto libre en px del plano se cambia por un formato fijo entre los
-- dos habituales en pantallas de TPV: panorámico 16:9 o estándar 4:3.
CREATE TYPE "FormatoPlano" AS ENUM ('PANORAMICO_16_9', 'ESTANDAR_4_3');

ALTER TABLE "locales" ADD COLUMN "planoFormato" "FormatoPlano" NOT NULL DEFAULT 'PANORAMICO_16_9';

ALTER TABLE "locales" DROP COLUMN "planoAlto";
