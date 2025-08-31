-- Add check constraints to enforce data integrity
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_name_not_empty" CHECK (LENGTH(TRIM("name")) > 0);
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_country_valid" CHECK ("country" ~ '^[A-Z]{2}$');