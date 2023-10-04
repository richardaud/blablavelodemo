//Demander l’itinéraire via le SDK REST


import * as atlas from "azure-maps-control";
import MapsRoute, { toColonDelimitedLatLonString } from "@azure-rest/maps-route";
import "azure-maps-control/dist/atlas.min.css";

const onload = () => {
  // Initialize a map instance.
  const map = new atlas.Map("map", {
    view: "Auto",
    // Add authentication details for connecting to Azure Maps.
    authOptions: {
      // Use Azure Active Directory authentication.
      authType: "aad",
      clientId: "<Your Azure Maps Client Id>",
      aadAppId: "<Your Azure Active Directory Client Id>",
      aadTenant: "<Your Azure Active Directory Tenant Id>"
    }
  });

  map.events.add("load", async () => {
    // Use the access token from the map and create an object that implements the TokenCredential interface.
    const credential = {
      getToken: () => {
        return {
          token: map.authentication.getToken()
        };
      }
    };

    // Create a Route client.
    const client = MapsRoute(credential, "<Your Azure Maps Client Id>");

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

    // Get the coordinates of the start and end points.
    const coordinates = [
      [startPoint.geometry.coordinates[1], startPoint.geometry.coordinates[0]],
      [endPoint.geometry.coordinates[1], endPoint.geometry.coordinates[0]]
    ];

    // Get the route directions between the start and end points.
    const response = await client.path("/route/directions/{format}", "json").get({
      queryParameters: {
        query: toColonDelimitedLatLonString(coordinates)
      }
    });

    // Get the GeoJSON feature collection of the route.
    const data = getFeatures(response.body.routes);

    // Add the route data to the data source.
    dataSource.add(data);

    // Update the map view to center over the route.
    map.setCamera({
      bounds: data.bbox,
      padding: 40
    });
  });
};

/**
 * Helper function to convert a route response into a GeoJSON FeatureCollection.
 */
const getFeatures = (routes) => {
  const bounds = [];
  const features = routes.map((route, index) => {
    const multiLineCoords = route.legs.map((leg) => {
      return leg.points.map((coord) => {
        const position = [coord.longitude, coord.latitude];
        bounds.push(position);
        return position;
      });
    });

    // Include all properties on the route object except legs.
    // Legs is used to create the MultiLineString, so we only need the summaries.
    // The legSummaries property replaces the legs property with just summary data.
    const props = {
      ...route,
      legSummaries: route.legs.map((leg) => leg.summary),
      resultIndex: index
    };
    delete props.legs;

    return {
      type: "Feature",
      geometry: {
        type: "MultiLineString",
        coordinates: multiLineCoords
      },
      properties: props
    };
  });

  return {
    type: "FeatureCollection",
    features: features,
    bbox: new atlas.data.BoundingBox.fromLatLngs(bounds)
  };
};

document.body.onload = onload;