import { useEffect, useRef, useState } from "react";
import "./App.css";
import * as tt from "@tomtom-international/web-sdk-maps";
import * as ttapi from "@tomtom-international/web-sdk-services";
import "@tomtom-international/web-sdk-maps/dist/maps.css";

const APP_KEY = "b8k1XNDAtxks9fGWLWGJTZxYrXMQ0o1r";

const App = () => {
  const mapElement = useRef();
  const [map, setMap] = useState({});
  const [longitude, setLongitude] = useState(-122.3321);
  const [latitude, setLatitude] = useState(47.6062);
  var nums = 1;

  const convertToPoints = (lngLat) => {
    return {
      point: {
        latitude: lngLat.lat,
        longitude: lngLat.lng,
      },
    };
  };

  const drawRoute = (geoJSON, map) => {
    if (map.getLayer("route")) {
      map.removeLayer("route");
      map.removeSource("route");
    }
    map.addLayer({
      id: "route",
      type: "line",
      source: {
        type: "geojson",
        data: geoJSON,
      },
      paint: {
        "line-color": "darkblue",
        "line-width": 6,
      },
    });
  };
  const addDeliveryMarker = (lngLat, map) => {
    const popupOffset = {
      bottom: [0, -25],
    };
    const popup = new tt.Popup({ offset: popupOffset }).setHTML(
      "Package " + nums
    );
    const element = document.createElement("div");
    element.className = "delivery-marker";
    const delivery = new tt.Marker({
      element: element,
    })
      .setLngLat(lngLat)
      .addTo(map);

    delivery.setPopup(popup).togglePopup();
  };

  useEffect(() => {
    const origin = {
      lng: longitude,
      lat: latitude,
    };
    const destinations = [];

    let map = tt.map({
      key: APP_KEY,
      container: mapElement.current,
      stylesVisibility: {
        trafficIncidents: true,
        trafficFlow: true,
      },
      center: [longitude, latitude],
      zoom: 14,
    });
    setMap(map);

    const addMarker = () => {
      const popupOffset = {
        bottom: [0, -25],
      };
      const popup = new tt.Popup({ offset: popupOffset }).setHTML(
        "This is you! (Move me)"
      );
      const element = document.createElement("div");
      element.className = "marker";

      const marker = new tt.Marker({
        draggable: true,
        element: element,
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        setLongitude(lngLat.lng);
        setLatitude(lngLat.lat);
      });

      marker.setPopup(popup).togglePopup();
    };
    addMarker();

    const sortDestinations = (location) => {
      const ptsForDestinations = location.map((destination) => {
        return convertToPoints(destination);
      });
      const callParams = {
        key: APP_KEY,
        destinations: ptsForDestinations,
        origins: [convertToPoints(origin)],
      };

      return new Promise((resolve, reject) => {
        ttapi.services.matrixRouting(callParams).then((matrixAPIResults) => {
          const results = matrixAPIResults.matrix[0];
          const resultsArray = results.map((result, index) => {
            return {
              location: location[index],
              drivingtime: result.response.routeSummary.travelTimeInSeconds,
            };
          });
          resultsArray.sort((a, b) => {
            return a.drivingtime - b.drivingtime;
          });
          const sortedLocations = resultsArray.map((result) => {
            return result.location;
          });
          resolve(sortedLocations);
        });
      });
    };

    const calculateRoutes = () => {
      sortDestinations(destinations).then((sorted) => {
        sorted.unshift(origin);

        ttapi.services
          .calculateRoute({
            key: APP_KEY,
            locations: sorted,
          })
          .then((routeData) => {
            const geoJSON = routeData.toGeoJson();
            drawRoute(geoJSON, map);
          });
      });
    };

    map.on("click", (event) => {
      destinations.push(event.lngLat);
      addDeliveryMarker(event.lngLat, map);
      nums = nums + 1;
      calculateRoutes();
    });

    return () => map.remove();
  }, [longitude, latitude]);

  return (
    <>
      {map && (
        <div className="App">
          <h2>
            You are at: longitude:{longitude} latitude:
            {latitude}
          </h2>
          <div ref={mapElement} className="map" />
          <div className="search-bar">
            <h2>Where are you at ?</h2>
            <input
              type="text"
              id="longitude"
              className="longitude"
              placeholder="Enter the longitude"
            />
            <input
              type="text"
              id="latitude"
              className="latitude"
              placeholder="Enter the latitude"
            />
            <button
              onClick={(e) => {
                setLongitude(document.getElementById("longitude").value);
                setLatitude(document.getElementById("latitude").value);
                document.getElementById("longitude").value = "";
                document.getElementById("latitude").value = "";
              }}
            >
              Go
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
