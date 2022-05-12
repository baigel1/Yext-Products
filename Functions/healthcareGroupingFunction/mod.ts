/* TEST */
export const myFunction = (input: string) => {
  return input;
};

async function checkForExistingEntity(id: string) {
  return await fetch(
    `https://api.yext.com/v2/accounts/me/entities/${id}?api_key=c8779e8a319bd0931f0871b6352d9e80&v=20220426`
  ).then((response) => {
    /**
     * Response Statuses
     * 404: entity does not exist
     * 200: entity does exist
     */
    if (response.status !== 200 && response.status !== 404) {
      console.log("ERROR");
      return "ERROR";
    } else if (!response.ok) {
      return false;
    } else {
      return true;
    }
  });

  /* check if entity exists
   * we only set up the webhook to fire when doctor entities are interacted with
   * 2 different event types - RECORD and TOMBSTONE
   * RECORD - a record was either created or edited
   * TOMBSTONE - a record was deleted
   * parse them differently
   */
}

const createNewEntity = async (
  id: string,
  doctorDetails: { name: any; npi: any },
  locationDetails: any
) => {
  /* build out the new entity */
  const entityObject = {
    meta: {
      id: id,
    },
    name: doctorDetails.name,
    npi: doctorDetails.npi,
    address: locationDetails.address,
  };
  console.log("creating entity for: ", locationDetails);

  await fetch(
    "https://api.yext.com/v2/accounts/me/entities?entityType=healthcareProfessional&api_key=c8779e8a319bd0931f0871b6352d9e80&v=20220426",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(entityObject),
    }
  )
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      return data;
    });
};

const deleteEntity = async (id: string) => {
  //this will delete the joined entity
  await fetch(
    `https://api.yext.com/v2/accounts/me/entities/${id}?api_key=c8779e8a319bd0931f0871b6352d9e80&v=20220426`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    }
  )
    .then((response) => response.json())
    .catch((error) => console.log(error));
};

async function record(id: string, locationID: string) {
  /* make API request to see if object in the KG exists */
  return await checkForExistingEntity(id + locationID);
}

const getHealthcareProfessionals = async () => {
  return await fetch(
    "https://api.yext.com/v2/accounts/me/entities?entityTypes=healthcareProfessional&api_key=c8779e8a319bd0931f0871b6352d9e80&v=20220426"
  )
    .then((response) => response.json())
    .then((data) => {
      return data.response.entities;
    })
    .catch((error) => {
      console.log(error);
    });
};

const getDoctors = async () => {
  return await fetch(
    "https://api.yext.com/v2/accounts/me/entities?entityTypes=ce_doctor&api_key=c8779e8a319bd0931f0871b6352d9e80&v=20220426"
  )
    .then((response) => response.json())
    .then((data) => {
      return data.response.entities;
    })
    .catch((error) => {
      console.log(error);
    });
};

//TODO does this handle multiple changes at once? like what if i change the state and the city in one go?
const updateHealthcareProfessionals = async (
  id: string,
  entity: any,
  key: string,
  newValue: any
) => {
  const newEntityObject = entity;
  newEntityObject[key] = newValue;
  console.log("UPDATING AN ENTITY")
  console.log(`id is: ${id} key is: ${key} new value is: `, newValue)

  return await fetch(
    `https://api.yext.com/v2/accounts/me/entities/${id}?api_key=c8779e8a319bd0931f0871b6352d9e80&v=20220426`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newEntityObject),
    }
  )
    .then((response) => response.json())
    .then((data) => {
      console.log(data.response.entities);
      return data.response.entities;
    })
    .catch((error) => {
      console.log(error);
    });
};

const handleCreatingEntities = async (
  webHookObject: any,
  doctorID: string,
  locationIDs: Array<string>,
  locations: Array<any>
) => {
  const newEntitiesCreated = [];
  for (let i = 0; i < locationIDs.length; i++) {
    const response = await record(doctorID, locationIDs[i]);

    /* if there was an error in the api call, terminate session */
    if (response === "ERROR") {
      console.log("terminating program");
      return -1;
    }

    if (!response) {
      console.log("entity does not exist!");

      /*  if it doesn't -- create a new entity */
      const doctorDetails = {
        name: webHookObject.docs[0].name,
        npi: webHookObject.docs[0].npi,
      };
      console.log("creating entity");
      const result = await createNewEntity(
        doctorID + locationIDs[i],
        doctorDetails,
        locations[i]
      );
      
      newEntitiesCreated.push(result);
    } else {
      console.log("entity already exists");
    }
  }
  return newEntitiesCreated;
};

const handleDeletingEntities = async (
  webHookObject: any,
  doctorID: string,
  locationIDs: Array<string>,
  locations: Array<any>
) => {
  /**
   * create an array of doctorID + locationID (A)
   * create an array of HP IDs that contain the docID string (B)
   * for each ID in (B) search if it's in (A)
   * if it is NOT, delete the HP
   *
   */
  //(A)
  const currentIDs = locationIDs.map((locID) => doctorID + locID);

  //get all the HP entities
  const entities = await getHealthcareProfessionals();

  //filter down to only healthcareProfessional entities
  //(B)
  const hpIDs = [];
  for (let i = 0; i < entities.length; i++) {
    if (
      entities[i].meta.entityType === "healthcareProfessional" &&
      entities[i].meta.id.includes(doctorID)
    ) {
      hpIDs.push(entities[i].meta.id);
    }
  }

  //check if there are any HPs NOT in the current IDs, and if so, delete them
  for (let i = 0; i < hpIDs.length; i++) {
    const index = currentIDs.indexOf(hpIDs[i]);
    //if doesn't exist, delete it
    if (index === -1) {
      const hpID = hpIDs[i];
      console.log("deleting... ", hpID);
      const response = await deleteEntity(hpID);
     
    }
  }
};

const handleUpdatingEntities = async (
  webHookObject: any,
  doctorID: string,
  locationIDs: Array<string>,
  locations: Array<any>
) => {
  console.log("updating entities!");

  const doctorFields = Object.entries(webHookObject.docs[0]);
  

  //get HP entities to check field values against
  const hpEntities = await getHealthcareProfessionals();

  const currentDoctorHPs = hpEntities.filter(
    (entity: { meta: { id: string } }) => entity.meta.id.includes(doctorID)
  );

  //filter down to doctor fields we want to compare
  let practicingLocations: Array<any> = [];
  const doctorKeys = [];
  const doctorValues = [];
  for (let i = 0; i < doctorFields.length; i++) {
    //loop through non practicingLocation fields
    if (
      doctorFields[i][0] !== "$key" &&
      doctorFields[i][0] !== "c_practicingLocation"
    ) {
      doctorKeys.push(doctorFields[i][0]);
      doctorValues.push(doctorFields[i][1]);
    } else if (doctorFields[i][0] === "c_practicingLocation") {
      practicingLocations = doctorFields[i][1] as Array<any>;
    }
  }
 
  //loop through this doctor's keys and check field values are equal with HPs
  for (let i = 0; i < doctorKeys.length; i++) {
    //check if doctor key is a key in HP
    //check if the value is the same
    for (let j = 0; j < currentDoctorHPs.length; j++) {
      if (doctorKeys[i] in currentDoctorHPs[j]) {
        if (doctorValues[i] !== currentDoctorHPs[j][doctorKeys[i]]) {
          //if the values don't match, then we need to update the HP entity!
          await updateHealthcareProfessionals(
            currentDoctorHPs[j].meta.id,
            currentDoctorHPs[j],
            doctorKeys[i],
            doctorValues[i]
          );
        }
      }
    }
  }

  //now let's handle the logic to check for practicing location updates

  for (let i = 0; i < practicingLocations.length; i++) {
    //for each practicing location, go through the motions of checking for matches in the HPs
    const plFields = Object.entries(practicingLocations[i]);
    const plKeys = [];
    const plValues = [];
    const plID = practicingLocations[i].id
    //create keys and values for a specific practicing location
    for (let j = 0; j < plFields.length; j++) {
      plKeys.push(plFields[j][0]);
      plValues.push(plFields[j][1]);
    }

    console.log("KEYS: ", plKeys)
    console.log("VALUES", plValues)
    console.log("HPS: ", currentDoctorHPs)
    //we need to MAKE SURE we are only checking if values are equal for HP ids that contain the PL id!!!
    //loop through this PL's keys and check field values are equal with HPs
    for (let k = 0; k < plKeys.length; k++) {
      //check if doctor key is a key in HP
      //check if the value is the same
      for (let l = 0; l < currentDoctorHPs.length; l++) {
        if (plKeys[k] in currentDoctorHPs[l]) {
          if (plKeys[k] !== "id" && plKeys[k] !== "name" && currentDoctorHPs[l].meta.id.includes(plID) && plValues[k] !== currentDoctorHPs[l][plKeys[k]]) {
            //if the values don't match, then we need to update the HP entity!
            await updateHealthcareProfessionals(
              currentDoctorHPs[l].meta.id,
              currentDoctorHPs[l],
              plKeys[k],
              plValues[k]
            );
          }
        }
      }
    }
  }
};

export const mainFunction = async (webHookObject: any) => {
  const eventType = webHookObject.meta.eventType;
  //if the eventType isn't RECORD, then we don't get the same webhook object
  if (eventType === "RECORD") {
    const doctorID = webHookObject.docs[0].id;
    const locationIDs: Array<string> = [];
    const locations: Array<any> = [];

    //check for case when we remove the final practicing location from a doctor entity
    //in this case we don't receive the practicingLocation field in the webhook object!
    if (!webHookObject.docs[0].c_practicingLocation) {
      //skip over entire function and just delete necessary HP entities
      return await handleDeletingEntities(
        webHookObject,
        doctorID,
        locationIDs,
        locations
      );
    }

    /* get array of locations for a given doctor */
    webHookObject.docs[0].c_practicingLocation.map((location: { id: any }) => {
      locationIDs.push(location.id);
      locations.push(location);
    });
    console.log("DATA FOR THE ACTION:");
    console.log("doctorID: ", doctorID);
    console.log("locationIDs: ", locationIDs);
    /* at this stage we have a list of location ids for a doctor
     * STEP 1:
     * we will check to see if HP entity exists for every location and if not, create it
     *
     * STEP 2:
     * check if there are extra HP entities for locations that don't exist anymore
     *
     * STEP 3:
     * check if there are any updates made to any of the remaining entities
     */

    /* STEP 1 */
    const creationResult = await handleCreatingEntities(
      webHookObject,
      doctorID,
      locationIDs,
      locations
    );
    

    /* STEP 2 -- this is not for deleting doctors, but rather for deleting HPs when a practicing location gets deleted */
    await handleDeletingEntities(
      webHookObject,
      doctorID,
      locationIDs,
      locations
    );

    /* STEP 3 */
    await handleUpdatingEntities(
      webHookObject,
      doctorID,
      locationIDs,
      locations
    );
  } else {
    //a TOMBSTONE occurs when a doctor entity has been deleted
    console.log("tombstoning");
    //we need to find all the joined entities that contain the deleted doctor id and delete them

    /**
     * PLAN:
     * 1. get doctors
     * 2. get HPs
     * 3. loop doctors and create a new array (A) of all HPs containing doctor IDs
     * 4. compare (A) and HPs list to create a new array (B) of all the HPs that don't exist in (A)
     * 5. loop through (B) and delete all the entities
     */
    const doctors = await getDoctors();
    const HPs = await getHealthcareProfessionals();

    //(A)
    const currentHPs: any[] = [];
    for (let i = 0; i < doctors.length; i++) {
      const doctorID = doctors[i].meta.id;
      for (let j = 0; j < HPs.length; j++) {
        if (HPs[j].meta.id.includes(doctorID)) {
          currentHPs.push(HPs[j]);
        }
      }
    }

    //(B)
    const extraHPs = HPs.filter((doc: any) => {
      if (!currentHPs.includes(doc)) {
        return doc;
      }
    });

    //loop through the extra HPs and delete them
    for (let i = 0; i < extraHPs.length; i++) {
      await deleteEntity(extraHPs[i].meta.id);
    }
  }
};