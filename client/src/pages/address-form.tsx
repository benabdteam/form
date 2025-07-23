import { useState, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertAddressSchema, type InsertAddress, type PlacesSuggestion, type PlacesDetails } from "@shared/schema";
import { MapPin, Loader2, Check, RotateCcw, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type FormData = InsertAddress;

interface SuggestionsResponse {
  predictions: PlacesSuggestion[];
}

export default function AddressForm() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const streetInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(insertAddressSchema),
    defaultValues: {
      streetAddress: "",
      city: "",
      state: "",
      zipCode: "",
      country: "US",
      apartment: "",
      addressType: "home",
    },
  });

  // Debounced search for address suggestions
  const { data: suggestions, isLoading: isSuggestionsLoading } = useQuery({
    queryKey: ["/api/places/suggestions", searchQuery],
    enabled: searchQuery.length >= 3,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Get place details when a suggestion is selected
  const placeDetailsMutation = useMutation({
    mutationFn: async (placeId: string): Promise<PlacesDetails> => {
      const res = await apiRequest("GET", `/api/places/details/${placeId}`);
      return res.json();
    },
    onSuccess: (details) => {
      // Auto-fill form fields with place details
      const streetAddress = [details.streetNumber, details.route].filter(Boolean).join(" ");
      
      form.setValue("streetAddress", streetAddress || searchQuery);
      
      if (details.locality) {
        form.setValue("city", details.locality);
      }
      
      if (details.administrativeAreaLevel1) {
        form.setValue("state", details.administrativeAreaLevel1);
      }
      
      if (details.postalCode) {
        form.setValue("zipCode", details.postalCode);
      }
      
      if (details.country) {
        form.setValue("country", details.country);
      }

      setShowSuggestions(false);
      setSearchQuery("");
      setApiError(null);
    },
    onError: (error: any) => {
      console.error("Place details error:", error);
      setApiError("Unable to fetch address details. You can continue entering address manually.");
      toast({
        variant: "destructive",
        title: "Address lookup failed",
        description: "Unable to auto-fill address details. Please enter manually.",
      });
    },
  });

  // Save address mutation
  const saveAddressMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/addresses", data);
      return res.json();
    },
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      toast({
        title: "Success!",
        description: "Your address has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
    },
    onError: (error: any) => {
      console.error("Save address error:", error);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Unable to save address. Please try again.",
      });
    },
  });

  // Handle street address input changes with debouncing
  const handleStreetAddressChange = useCallback((value: string) => {
    form.setValue("streetAddress", value);
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        setShowSuggestions(true);
        setApiError(null);
      }, 300);
    } else {
      setShowSuggestions(false);
    }
  }, [form]);

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: PlacesSuggestion) => {
    setSelectedPlaceId(suggestion.placeId);
    setSearchQuery(suggestion.mainText);
    form.setValue("streetAddress", suggestion.mainText);
    placeDetailsMutation.mutate(suggestion.placeId);
  };

  // Handle form submission
  const onSubmit = (data: FormData) => {
    saveAddressMutation.mutate(data);
  };

  // Handle form clear
  const handleClear = () => {
    form.reset();
    setSearchQuery("");
    setShowSuggestions(false);
    setApiError(null);
    setShowSuccess(false);
    setSelectedPlaceId(null);
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        streetInputRef.current &&
        !streetInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Monitor query error
  useEffect(() => {
    if (suggestions && "error" in suggestions) {
      setApiError("Address autocomplete is temporarily unavailable. You can still enter your address manually.");
    }
  }, [suggestions]);

  const suggestionsData = suggestions as SuggestionsResponse | undefined;
  const formErrors = form.formState.errors;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Address Information</h1>
          <p className="text-gray-600">Enter your address details with auto-complete assistance</p>
        </div>

        {/* Main Form Container */}
        <Card className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Street Address Field with Autocomplete */}
            <div className="space-y-2">
              <Label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700">
                Street Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  ref={streetInputRef}
                  id="streetAddress"
                  autoComplete="street-address"
                  placeholder="Start typing your address..."
                  value={form.watch("streetAddress")}
                  onChange={(e) => handleStreetAddressChange(e.target.value)}
                  className={cn(
                    "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 placeholder-gray-400",
                    formErrors.streetAddress && "border-red-300 focus:border-red-500 focus:ring-red-500"
                  )}
                />
                
                {/* Loading Spinner */}
                {isSuggestionsLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                  </div>
                )}
                
                {/* Suggestions Dropdown */}
                {showSuggestions && suggestionsData?.predictions && suggestionsData.predictions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-50 max-h-60 overflow-y-auto"
                  >
                    {suggestionsData.predictions.map((suggestion) => (
                      <div
                        key={suggestion.placeId}
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                      >
                        <div className="flex items-start space-x-3">
                          <MapPin className="text-gray-400 mt-1 text-sm h-4 w-4" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{suggestion.mainText}</div>
                            <div className="text-xs text-gray-500">{suggestion.secondaryText}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {formErrors.streetAddress && (
                <div className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="mr-1 h-4 w-4" />
                  <span>{formErrors.streetAddress.message}</span>
                </div>
              )}
            </div>

            {/* Address Components Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* City Field */}
              <div className="space-y-2">
                <Label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  autoComplete="address-level2"
                  placeholder="Enter city"
                  {...form.register("city")}
                  className={cn(
                    "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 placeholder-gray-400",
                    formErrors.city && "border-red-300 focus:border-red-500 focus:ring-red-500"
                  )}
                />
                {formErrors.city && (
                  <div className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="mr-1 h-4 w-4" />
                    <span>{formErrors.city.message}</span>
                  </div>
                )}
              </div>

              {/* State Field */}
              <div className="space-y-2">
                <Label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State/Province <span className="text-red-500">*</span>
                </Label>
                <Select value={form.watch("state")} onValueChange={(value) => form.setValue("state", value)}>
                  <SelectTrigger className={cn(
                    "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 bg-white",
                    formErrors.state && "border-red-300 focus:border-red-500 focus:ring-red-500"
                  )}>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CA">California</SelectItem>
                    <SelectItem value="NY">New York</SelectItem>
                    <SelectItem value="TX">Texas</SelectItem>
                    <SelectItem value="FL">Florida</SelectItem>
                    <SelectItem value="WA">Washington</SelectItem>
                    <SelectItem value="AL">Alabama</SelectItem>
                    <SelectItem value="AZ">Arizona</SelectItem>
                    <SelectItem value="CO">Colorado</SelectItem>
                    <SelectItem value="IL">Illinois</SelectItem>
                    <SelectItem value="NV">Nevada</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.state && (
                  <div className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="mr-1 h-4 w-4" />
                    <span>{formErrors.state.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ZIP Code and Country */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ZIP Code */}
              <div className="space-y-2">
                <Label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                  ZIP/Postal Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="zipCode"
                  autoComplete="postal-code"
                  placeholder="Enter ZIP code"
                  {...form.register("zipCode")}
                  className={cn(
                    "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 placeholder-gray-400",
                    formErrors.zipCode && "border-red-300 focus:border-red-500 focus:ring-red-500"
                  )}
                />
                {formErrors.zipCode && (
                  <div className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="mr-1 h-4 w-4" />
                    <span>{formErrors.zipCode.message}</span>
                  </div>
                )}
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="country" className="block text-sm font-medium text-gray-700">
                  Country <span className="text-red-500">*</span>
                </Label>
                <Select value={form.watch("country")} onValueChange={(value) => form.setValue("country", value)}>
                  <SelectTrigger className={cn(
                    "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 bg-white",
                    formErrors.country && "border-red-300 focus:border-red-500 focus:ring-red-500"
                  )}>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.country && (
                  <div className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="mr-1 h-4 w-4" />
                    <span>{formErrors.country.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Optional Fields */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information (Optional)</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Apartment/Unit */}
                <div className="space-y-2">
                  <Label htmlFor="apartment" className="block text-sm font-medium text-gray-700">
                    Apartment/Unit
                  </Label>
                  <Input
                    id="apartment"
                    placeholder="Apt, Suite, Unit, etc."
                    {...form.register("apartment")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 placeholder-gray-400"
                  />
                </div>

                {/* Address Type */}
                <div className="space-y-2">
                  <Label htmlFor="addressType" className="block text-sm font-medium text-gray-700">
                    Address Type
                  </Label>
                  <Select value={form.watch("addressType")} onValueChange={(value: "home" | "work" | "other") => form.setValue("addressType", value)}>
                    <SelectTrigger className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 bg-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Error Display for API Issues */}
            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="text-red-500 mt-0.5 h-5 w-5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Address Service Unavailable</h4>
                    <p className="text-sm text-red-700 mt-1">{apiError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
              <Button
                type="submit"
                disabled={saveAddressMutation.isPending}
                className="flex-1 sm:flex-none sm:px-8 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                {saveAddressMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Save Address
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                className="flex-1 sm:flex-none sm:px-8 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Clear Form
              </Button>
            </div>
          </form>
        </Card>

        {/* Success Message */}
        {showSuccess && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Check className="text-green-500 h-5 w-5" />
              <div>
                <h4 className="text-sm font-medium text-green-800">Address Saved Successfully</h4>
                <p className="text-sm text-green-700 mt-1">Your address information has been saved and validated.</p>
              </div>
            </div>
          </div>
        )}

        {/* Form Guidelines */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="text-blue-500 mt-0.5 h-5 w-5" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Address Input Tips</h4>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• Start typing your street address to see suggestions</li>
                <li>• Select from the dropdown to auto-fill remaining fields</li>
                <li>• All required fields must be completed before saving</li>
                <li>• Address validation ensures delivery accuracy</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
