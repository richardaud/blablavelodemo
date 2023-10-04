//Demander l'itinéraire via l'API de récupération

import * as atlas from "azure-maps-control";
import "azure-maps-control/dist/atlas.min.css";

const onload = () => {
  // Initialize a map instance.
  const map = new atlas.Map("map", {
    view: "Auto",
    // Add authentication details for connecting to Azure Maps.
    authOptions: {
      // Use Azure Active Directory authentication.
      authType: "aad",
      clientId: "a2ede2d8-3c17-45a8-b27e-5d62e0a223d2",
      aadAppId: "97df94a6-07df-4770-b608-afd5a5fb1f65",
      aadTenant: "3de25f93-4523-410c-b2f4-c5b2ea7ed85b"
    }
  });

  map.events.add("load", async () => {
    // Create a data source and add it to the map.
    const dataSource = new atlas.source.DataSource();
    map.sources.add(dataSource);

    // Create the GeoJSON objects which represent the start and end points of the route.
    const startPoint = new atlas.data.Feature(new atlas.data.Point([-122.130137, 47.644702]), {
      title: "Redmond",
      icon: "pin-blue"
    });

    const endPoint = new atlas.data.Feature(new atlas.data.Point([-122.3352, 47.61397]), {
      title: "Seattle",
      icon: "pin-round-blue"
    });

    // Add the data to the data source.
    dataSource.add([startPoint, endPoint]);

    // Create a layer for rendering the route line under the road labels.
    map.layers.add(
      new atlas.layer.LineLayer(dataSource, null, {
        strokeColor: "#2272B9",
        strokeWidth: 5,
        lineJoin: "round",
        lineCap: "round"
      }),
      "labels"
    );

    // Create a layer for rendering the start and end points of the route as symbols.
    map.layers.add(
      new atlas.layer.SymbolLayer(dataSource, null, {
        iconOptions: {
          image: ["get", "icon"],
          allowOverlap: true,
          ignorePlacement: true
        },
        textOptions: {
          textField: ["get", "title"],
          offset: [0, 1.2]
        },
        filter: ["any", ["==", ["geometry-type"], "Point"], ["==", ["geometry-type"], "MultiPoint"]] //Only render Point or MultiPoints in this layer.
      })
    );

    // Send a request to the route API
    let url = "https://atlas.microsoft.com/route/directions/json?";
    url += "&api-version=1.0";
    url +=
      "&query=" +
      startPoint.geometry.coordinates[1] +
      "," +
      startPoint.geometry.coordinates[0] +
      ":" +
      endPoint.geometry.coordinates[1] +
      "," +
      endPoint.geometry.coordinates[0];

    // Process request
    fetch(url, {
      headers: {
        Authorization: "Bearer " + map.authentication.getToken(),
        "x-ms-client-id": "<Your Azure Maps Client Id>"
      }
    })
      .then((response) => response.json())
      .then((response) => {
        const bounds = [];
        const route = response.routes[0];
        
        // Create an array to store the coordinates of each turn
        let routeCoordinates = [];
        route.legs.forEach((leg) => {
          const legCoordinates = leg.points.map((point) => {
            const position = [point.longitude, point.latitude];
            bounds.push(position);
            return position;
          });
          // Add each turn coordinate to the array
          routeCoordinates = routeCoordinates.concat(legCoordinates);
        });

        // Add route line to the dataSource
        dataSource.add(new atlas.data.Feature(new atlas.data.LineString(routeCoordinates)));

        // Update the map view to center over the route.
        map.setCamera({
          bounds: new atlas.data.BoundingBox.fromLatLngs(bounds),
          padding: 40
        });
      });
  });
};

document.body.onload = onload;