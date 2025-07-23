import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  streetAddress: text("street_address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  country: text("country").notNull().default("US"),
  apartment: text("apartment"),
  addressType: text("address_type").notNull().default("home"),
  userId: integer("user_id"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAddressSchema = createInsertSchema(addresses).omit({
  id: true,
  userId: true,
}).extend({
  streetAddress: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required").regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code"),
  country: z.string().min(1, "Country is required"),
  apartment: z.string().optional(),
  addressType: z.enum(["home", "work", "other"]).default("home"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Address = typeof addresses.$inferSelect;

export interface PlacesSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlacesDetails {
  streetNumber?: string;
  route?: string;
  locality?: string;
  administrativeAreaLevel1?: string;
  postalCode?: string;
  country?: string;
}
