import json
import random

def random_hex_color():
    return "#{:06x}".format(random.randint(0, 0xFFFFFF))

def add_properties_to_features(geojson_data):
    for feature in geojson_data.get('features', []):
        # Assign given stroke properties
        feature['properties']['stroke'] = random_hex_color()
        feature['properties']['stroke-width'] = 7
        feature['properties']['stroke-opacity'] = 1
        
        # Assign random fill color
        feature['properties']['fill'] = random_hex_color()
        feature['properties']['fill-opacity'] = 0.3
    return geojson_data

# Path to the GeoJSON file
geojson_file_path = 'balangan.geojson'

with open(geojson_file_path, 'r') as geojson_file:
    # Load GeoJSON data
    geojson_data = json.load(geojson_file)

# Modify the GeoJSON data
updated_geojson_data = add_properties_to_features(geojson_data)
output= "balangan3.geojson"
# Save the updated GeoJSON to a new file
with open(output, 'w') as updated_geojson_file:
    json.dump(updated_geojson_data, updated_geojson_file, indent=4)

print(f"Updated GeoJSON saved to {output}")