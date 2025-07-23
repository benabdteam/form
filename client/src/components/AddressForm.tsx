import { useEffect, useRef } from "react";

export default function AddressForm() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!window.google || !inputRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: "us" },
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      console.log("Selected address:", place);

      let street = "";
      let city = "";
      let state = "";

      for (const component of place.address_components) {
        const types = component.types;
        if (types.includes("street_number")) {
          street = component.long_name + " ";
        }
        if (types.includes("route")) {
          street += component.long_name;
        }
        if (types.includes("locality")) {
          city = component.long_name;
        }
        if (types.includes("administrative_area_level_1")) {
          state = component.short_name;
        }
      }

      // Виводимо в консоль результат
      console.log({ street, city, state });
    });
  }, []);

  return (
    <div className="p-4 space-y-2">
      <label className="block text-sm font-medium">Address</label>
      <input
        type="text"
        placeholder="Start typing address..."
        ref={inputRef}
        className="w-full border rounded p-2"
      />
    </div>
  );
}
