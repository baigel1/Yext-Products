import { myFunction, mainFunction } from "./mod.ts";
//import { assertEquals } from "https://deno.land/std@0.114.0/testing/asserts.ts";

// Deno.test("Test My Function", () => {
//   const input = "hello";
//   const output = myFunction(input);
//   console.log("no way")
//   console.log(output)

// });

const webHookData = {
  docs: [
    {
      $key: {
        locale: "",
        primary_key: "38202461",
      },
      c_practicingLocation: [
        {
          address: {
            city: "New York",
            countryCode: "US",
            line1: "100 Zillion Street",
            postalCode: "11237",
            region: "NY",
          },
          id: "location3",
          name: "Davish Clinic",
        },
      ],
      id: "doctor1",
      name: "Daniel Baigel",
      npi: "1457562548",
      uid: 38202461,
    },
  ],
  meta: {
    appSpecificAccountId: "058ca4f0ab14b4d0d14577667d595d403218d0da",
    eventType: "RECORD",
    timestamp: 1651696582632,
    uuid: "9f7dbc26-f669-4d81-a53a-0889ef46126d",
  },
};

const tombstoneData = {
  docs: [
    {
      $key: {
        locale: "",
        primary_key: "38204331",
      },
    },
  ],
  meta: {
    appSpecificAccountId: "058ca4f0ab14b4d0d14577667d595d403218d0da",
    eventType: "TOMBSTONE",
    timestamp: 1651524460310,
    uuid: "8c41a382-f959-48dc-9b2e-c5acd462670a",
  },
};

const removeFinalPLData = {
  docs: [
    {
      $key: {
        locale: "",
        primary_key: "38202461",
      },
      id: "doctor1",
      name: "Daniel Baigel",
      npi: "1457562548",
      uid: 38202461,
    },
  ],
  meta: {
    appSpecificAccountId: "058ca4f0ab14b4d0d14577667d595d403218d0da",
    eventType: "RECORD",
    timestamp: 1651694411647,
    uuid: "6e513f43-0ec2-4dca-a3a5-9bdaab8ed436",
  },
};

const testFunc = () => {
  return mainFunction(webHookData);
};

const tombstone = () => {
  return mainFunction(tombstoneData);
};

console.log(testFunc());
//console.log(tombstone());
