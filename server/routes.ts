import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAddressSchema, type PlacesSuggestion, type PlacesDetails } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Google Places API integration
  const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY || "";

  // Get address suggestions from Google Places API
  app.get("/api/places/suggestions", async (req, res) => {
    try {
      const { input } = req.query;
      
      if (!input || typeof input !== "string" || input.length < 3) {
        return res.json({ predictions: [] });
      }

      if (!GOOGLE_API_KEY) {
        return res.status(503).json({ 
          error: "Google Places API key not configured",
          message: "Address autocomplete is temporarily unavailable"
        });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&key=${GOOGLE_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new Error(`Google Places API error: ${data.status}`);
      }

      const suggestions: PlacesSuggestion[] = data.predictions?.map((prediction: any) => ({
        placeId: prediction.place_id,
        description: prediction.description,
        mainText: prediction.structured_formatting?.main_text || prediction.description,
        secondaryText: prediction.structured_formatting?.secondary_text || "",
      })) || [];

      res.json({ predictions: suggestions });
    } catch (error) {
      console.error("Places API error:", error);
      res.status(500).json({ 
        error: "Failed to fetch address suggestions",
        message: "Address autocomplete service is temporarily unavailable"
      });
    }
  });

  // Get place details from Google Places API
  app.get("/api/places/details/:placeId", async (req, res) => {
    try {
      const { placeId } = req.params;

      if (!GOOGLE_API_KEY) {
        return res.status(503).json({ 
          error: "Google Places API key not configured",
          message: "Address details service is temporarily unavailable"
        });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_components&key=${GOOGLE_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== "OK") {
        throw new Error(`Google Places API error: ${data.status}`);
      }

      const addressComponents = data.result?.address_components || [];
      const details: PlacesDetails = {};

      addressComponents.forEach((component: any) => {
        const types = component.types;
        
        if (types.includes("street_number")) {
          details.streetNumber = component.long_name;
        } else if (types.includes("route")) {
          details.route = component.long_name;
        } else if (types.includes("locality")) {
          details.locality = component.long_name;
        } else if (types.includes("administrative_area_level_1")) {
          details.administrativeAreaLevel1 = component.short_name;
        } else if (types.includes("postal_code")) {
          details.postalCode = component.long_name;
        } else if (types.includes("country")) {
          details.country = component.short_name;
        }
      });

      res.json(details);
    } catch (error) {
      console.error("Place details API error:", error);
      res.status(500).json({ 
        error: "Failed to fetch address details",
        message: "Address details service is temporarily unavailable"
      });
    }
  });

  // Save address
  app.post("/api/addresses", async (req, res) => {
    try {
      const validatedData = insertAddressSchema.parse(req.body);
      const address = await storage.createAddress(validatedData);
      res.status(201).json(address);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: error.errors
        });
      }
      console.error("Address creation error:", error);
      res.status(500).json({ 
        error: "Failed to save address",
        message: "Unable to save address. Please try again."
      });
    }
  });

  // Get all addresses
  app.get("/api/addresses", async (req, res) => {
    try {
      const addresses = await storage.getAddresses();
      res.json(addresses);
    } catch (error) {
      console.error("Get addresses error:", error);
      res.status(500).json({ 
        error: "Failed to fetch addresses",
        message: "Unable to retrieve addresses. Please try again."
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
