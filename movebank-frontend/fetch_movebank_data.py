import requests
import os
import hashlib
import csv
import json
import io
from datetime import datetime, timedelta

def callMovebankAPI(params):
    # Requests Movebank API with ((param1, value1), (param2, value2),).
    # Assumes the environment variables 'mbus' (Movebank user name) and 'mbpw' (Movebank password).
    # Returns the API response as plain text.

    response = requests.get(
        'https://www.movebank.org/movebank/service/direct-read',
        params=params,
        auth=(os.environ['mbus'], os.environ['mbpw'])
    )
    print("Request " + response.url)
    if response.status_code == 200:  # successful request
        if 'License Terms:' in str(response.content):
            # only the license terms are returned, hash and append them in a subsequent request.
            # See also
            # https://github.com/movebank/movebank-api-doc/blob/master/movebank-api.md#read-and-accept-license-terms-using-curl
            print("Has license terms")
            hash = hashlib.md5(response.content).hexdigest()
            params = params + (('license-md5', hash),)
            # also attach previous cookie:
            response = requests.get(
                'https://www.movebank.org/movebank/service/direct-read',
                params=params,
                cookies=response.cookies,
                auth=(os.environ['mbus'], os.environ['mbpw'])
            )
            if response.status_code == 403:  # incorrect hash
                print("Incorrect hash")
                return ''
        return response.content.decode('utf-8')
    print(str(response.content))
    return ''

def getStudies():
    studies = callMovebankAPI((
        ('entity_type', 'study'),
        ('i_can_see_data', 'true'),
        ('there_are_data_which_i_cannot_see', 'false')
    ))
    if len(studies) > 0:
        # parse raw text to dicts
        studies = csv.DictReader(io.StringIO(studies), delimiter=',')
        return [s for s in studies if s['i_can_see_data'] == 'true' and s['there_are_data_which_i_cannot_see'] == 'false']
    return []

def getStudiesBySensor(studies, sensorname='GPS'):
    return [s for s in studies if sensorname in s['sensor_type_ids']]

def getIndividualsByStudy(study_id):
    individuals = callMovebankAPI((('entity_type', 'individual'), ('study_id', study_id)))
    if len(individuals) > 0:
        return list(csv.DictReader(io.StringIO(individuals), delimiter=','))
    return []

def getIndividualEvents(study_id, individual_id, sensor_type_id=653):
    # See below table for sensor_type_id's.

    params = (
        ('entity_type', 'event'),
        ('study_id', study_id),
        ('individual_id', individual_id),
        ('sensor_type_id', sensor_type_id),
        ('attributes', 'all')
    )
    events = callMovebankAPI(params)
    if len(events) > 0:
        return list(csv.DictReader(io.StringIO(events), delimiter=','))
    return []

def transformRawGPS(gpsevents):
    # Returns a list of (ts, deployment_id, lat, long) tuples

    def transform(e):  # dimension reduction and data type conversion
        try:
            if len(e['location_lat']) > 0:
                e['location_lat'] = float(e['location_lat'])
            if len(e['location_long']) > 0:
                e['location_long'] = float(e['location_long'])
        except:
            print("Could not parse long/lat.")
        return e['timestamp'], e['deployment_id'], e['location_lat'], e['location_long']

    return [transform(e) for e in gpsevents]

def transformRawACC(accevents, unit='m/s2', sensitivity='high'):
    # Transforms raw tri-axial acceleration from X Y Z X Y X Y Z to [(ts_interpol, deployment, X', Y', Z'),...]
    # X', Y', Z' are in m/s^2 or g. Assumes e-obs acceleration sensors.
    # Acknowledgments to Anne K. Scharf and her great moveACC package, see https://gitlab.com/anneks/moveACC

    ts_format = '%Y-%m-%d %H:%M:%S.%f'
    out = []

    if unit == 'g':
        unitfactor = 1
    else:
        unitfactor = 9.81

    tag_local_identifier = int(accevents[0]['tag_local_identifier'])
    slope = 0.001  # e-obs 1st generation, high sensitivity

    if tag_local_identifier <= 2241:
        if sensitivity == 'low':
            slope = 0.0027
    elif 2242 <= tag_local_identifier <= 4117:  # e-obs 2nd generation
        slope = 0.0022
    else:
        slope = 1/512

    for event in accevents:
        deploym = event['deployment_id']
        seconds = 1/float(event['eobs_acceleration_sampling_frequency_per_axis'])
        parsedts = datetime.strptime(event['timestamp'], ts_format)  # start timestamp
        raw = list(map(int, event['eobs_accelerations_raw'].split()))

        # derive in-between timestamps:
        ts = [parsedts + timedelta(seconds=seconds * x) for x in range(0, int(len(raw)/3))]

        # transform XYZ list to list of (ts, deployment, x, y, z) tuples
        it = iter(raw)
        transformed = [
            (
                a.strftime(ts_format),
                deploym,
                (b[0]-2048)*slope*unitfactor,
                (b[1]-2048)*slope*unitfactor,
                (b[2]-2048)*slope*unitfactor
            )
            for (a, b) in list(zip(ts, list(zip(it, it, it))))
        ]
        out.append(transformed)
    return out

def main():
    all_data = {}  # Initialize an empty dictionary to hold all data

    # Get all studies
    allstudies = getStudies()
    all_data['all_studies'] = allstudies

    # Filter studies by GPS sensor
    gpsstudies = getStudiesBySensor(allstudies, 'GPS')
    all_data['gps_studies'] = gpsstudies

    # Get individuals in a specific study
    study_id = 9493874  # Replace with your desired study ID
    individuals = getIndividualsByStudy(study_id=study_id)
    all_data['individuals'] = individuals

    # Get GPS events for a specific individual
    if individuals:
        individual_id = individuals[0]['id']  # Use the first individual's ID
        gpsevents = getIndividualEvents(
            study_id=study_id,
            individual_id=individual_id,
            sensor_type_id=653  # GPS sensor type ID
        )
        if gpsevents:
            transformed_gpsevents = transformRawGPS(gpsevents)
            all_data['gps_events'] = transformed_gpsevents

        # Get ACC events for the same individual
        accevents = getIndividualEvents(
            study_id=study_id,
            individual_id=individual_id,
            sensor_type_id=2365683  # ACC sensor type ID
        )
        if accevents:
            transformed_accevents = transformRawACC(accevents)
            # Flatten the list of lists
            flattened_accevents = [item for sublist in transformed_accevents for item in sublist]
            all_data['acc_events'] = flattened_accevents

    # Save all data to a JSON file
    with open('movebank_data.json', 'w', encoding='utf-8') as json_file:
        json.dump(all_data, json_file, ensure_ascii=False, indent=2)

    print("Data has been saved to movebank_data.json")

if __name__ == "__main__":
    main()
