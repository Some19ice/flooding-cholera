import { useEffect, useState } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon not finding images in Webpack/Vite
// We'll use a custom SVG icon for hospitals
const hospitalIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIj48cGF0aCBkPSJNMTIgMjFjNC45NyAwIDktNC4wMyA5LTlTNCAzIDEyIDMgMyA3LjAzIDMgMTJzNC4wMyA5IDkgOXoiLz48cGF0aCBkPSJNMTUgMTFoLTN2LTNoLTR2M2gtM3Y0aDN2M2g0di0zaDN6IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

const clinicIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzI1NjNmYiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIj48cGF0aCBkPSJNMTIgMjFjNC45NyAwIDktNC4wMyA5LTlTNCAzIDEyIDMgMyA3LjAzIDMgMTJzNC4wMyA5IDkgOXoiLz48cGF0aCBkPSJNMTUgMTFoLTN2LTNoLTR2M2gtM3Y0aDN2M2g0di0zaDN6IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

interface Facility {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number]; // GeoJSON is [lon, lat]
  };
  properties: {
    id: number;
    name: string;
    type: string;
    lga_id: number;
  };
}

interface FeatureCollection {
  type: string;
  features: Facility[];
}

export default function HealthFacilitiesLayer() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    fetch('/api/facilities/geojson')
      .then(res => res.json())
      .then((data: FeatureCollection) => {
        setFacilities(data.features);
      })
      .catch(err => console.error("Failed to load facilities:", err));
  }, []);

  if (!visible) return null;

  return (
    <>
      {facilities.map(facility => {
        // GeoJSON is [lon, lat], Leaflet wants [lat, lon]
        const position: [number, number] = [
          facility.geometry.coordinates[1],
          facility.geometry.coordinates[0]
        ];
        
        const isHospital = facility.properties.type && 
          (facility.properties.type.includes('hospital') || facility.properties.type.includes('general'));

        return (
          <Marker 
            key={facility.properties.id} 
            position={position}
            icon={isHospital ? hospitalIcon : clinicIcon}
          >
            <Popup>
              <div className="text-sm">
                <strong className="block text-base">{facility.properties.name}</strong>
                <span className="text-gray-600 capitalize">{facility.properties.type || 'Health Facility'}</span>
              </div>
            </Popup>
          </Marker>
        );
      })}
      
      {/* Toggle Control (could be moved to a UI panel) */}
      <div className="absolute top-4 left-16 z-[1000] bg-white p-2 rounded shadow flex items-center gap-2">
        <input 
          type="checkbox" 
          id="showFacilities" 
          checked={visible} 
          onChange={e => setVisible(e.target.checked)} 
        />
        <label htmlFor="showFacilities" className="text-xs font-semibold cursor-pointer">
          🏥 Health Facilities
        </label>
      </div>
    </>
  );
}
