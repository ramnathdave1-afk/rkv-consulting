'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadGoogleMapsApi } from '@/lib/apis/googlemaps';

export type AddressData = {
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  lat: number;
  lng: number;
  placeId: string;
};

export interface AddressAutocompleteProps {
  onAddressSelect: (address: AddressData) => void;
  placeholder?: string;
  className?: string;
}

function getComponent(components: google.maps.GeocoderAddressComponent[] | undefined, type: string) {
  return components?.find((c) => c.types.includes(type));
}

function buildStreet(components: google.maps.GeocoderAddressComponent[] | undefined) {
  const streetNumber = getComponent(components, 'street_number')?.long_name ?? '';
  const route = getComponent(components, 'route')?.long_name ?? '';
  return [streetNumber, route].filter(Boolean).join(' ').trim();
}

export default function AddressAutocomplete({
  onAddressSelect,
  placeholder = 'Start typing an address…',
  className,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [value, setValue] = useState('');
  const [selected, setSelected] = useState(false);

  const inputClasses = useMemo(
    () =>
      cn(
        'w-full h-10 px-3 rounded-[6px]',
        'bg-[var(--bg-primary)] border border-border',
        'text-white font-body text-[14px]',
        'placeholder:text-muted-deep',
        'focus:outline-none focus:border-gold focus:ring-2 focus:ring-[rgba(201,168,76,0.12)]',
        'transition-all duration-150 ease-out',
        selected && 'pr-10',
        className,
      ),
    [className, selected],
  );

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!inputRef.current) return;
      try {
        await loadGoogleMapsApi();

        if (!mounted || !inputRef.current) return;

        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['formatted_address', 'address_components', 'geometry', 'place_id'],
        });

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          if (!place?.geometry?.location || !place.place_id) return;

          const fullAddress = place.formatted_address ?? '';
          const street = buildStreet(place.address_components);
          const city =
            getComponent(place.address_components, 'locality')?.long_name ??
            getComponent(place.address_components, 'postal_town')?.long_name ??
            '';
          const state = getComponent(place.address_components, 'administrative_area_level_1')?.short_name ?? '';
          const zip = getComponent(place.address_components, 'postal_code')?.long_name ?? '';
          const county = getComponent(place.address_components, 'administrative_area_level_2')?.long_name ?? '';

          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          const data: AddressData = {
            fullAddress,
            street: street || fullAddress,
            city,
            state,
            zip,
            county,
            lat,
            lng,
            placeId: place.place_id,
          };

          setValue(fullAddress);
          setSelected(true);
          onAddressSelect(data);
        });
      } catch (e) {
        // Non-fatal: input still works without autocomplete
        // eslint-disable-next-line no-console
        console.error('[AddressAutocomplete] Failed to init Google Places', e);
      }
    }

    init();

    return () => {
      mounted = false;
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [onAddressSelect]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSelected(false);
        }}
        placeholder={placeholder}
        className={inputClasses}
      />
      {selected && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gold">
          <Check className="w-4 h-4" strokeWidth={2} />
        </span>
      )}
    </div>
  );
}

