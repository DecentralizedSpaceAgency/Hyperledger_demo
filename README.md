# Hermes Network Hyperledger Demo

## Models within this business network

### Participants
`Company`, `Customer`, `GroundStation`, `Regulator`, `Satellite`

### Assets
`ServiceRequest`

### Transactions
`InitialApplication`, `approveRequest`, `RejectRequest`, `SendToGroundStation`, `ReceivedByGroundStation`, `SatelliteConfirmation`, `GroundStationDownload`, `ReadyForPayment`, `Close`

### Events
`InitialApplicationEvent`, `approveRequestEvent`, `RejectRequestEvent`, `SendToGroundStationEvent`, `ReceivedByGroundStationEvent`, `SatelliteConfirmationEvent`, `GroundStationDownloadEvent`, `ReadyForPaymentEvent`, `CloseEvent`

## Testing this network within composer playground
The steps below will simulate the above scenario within composer playground.

Navigate to the **Test** tab and then submit a `CreateDemoParticipants` transaction:

```
{
  "$class": "org.example.loc.CreateDemoParticipants"
}
```

Navigate to the **Test** tab and then submit an `InitialApplication` transaction to request satellite services. 

```
{
    "$class": "org.example.loc.InitialApplication",
    "requestId": "REQUEST-REF-123",
    "applicant": "resource:org.example.loc.Customer#Startup",
    "beneficiary": "resource:org.example.loc.Company#ESA",
    "issuingSatellite": "resource:org.example.loc.Satellite#ESA1",
    "rules": [
      {
        "ruleId": "REQUEST-REF-123-RULE-1",
        "ruleText": "Description of rule 1"
      },
      {
        "ruleId": "REQUEST-REF-123-RULE-2",
        "ruleText": "Description of rule 2"
      }
    ],
    "requestDetails": {
        "$class": "org.example.loc.RequestDetails",
        "productType": "Imagery",
        "targetCountry": "UK",
        "lat": 876554,
        "long": 764769,
        "timestampRange": 1549969957
      }
  }
```

This creates a `ServiceRequest` asset.

---

Regulator needs to `Approve` request, if it's compliant to the regulators law. Request is validated by “law & regulation” enforcement smart contract (chaincode) and status is set to `APPROVED` or `REJECTED`.

Approve the request by submitting an `approveRequest` transaction: 
```
  {
    "$class": "org.example.loc.approveRequest",
    "loc": "resource:org.example.loc.ServiceRequest#REQUEST-REF-123",
    "approvingParty": "resource:org.example.loc.Regulator#EU"
  }
```
---

Hermes receives validated and approved request and selects ground station based on the closest communication to the requested satellite.

Submit `SendToGroundStation` transaction:
```
 {
    "$class": "org.example.loc.SendToGroundStation",
    "loc": "resource:org.example.loc.ServiceRequest#REQUEST-REF-123",
    "evidence": "GS_SIGNATURE_116527"
  }
```
---

Ground station receives validated request with specific parameters and starts broadcasting it to the satellite.

Submit `ReceivedByGroundStation` transaction:
```
  {
    "$class": "org.example.loc.ReceivedByGroundStation",
    "loc": "resource:org.example.loc.ServiceRequest#REQUEST-REF-123",
    "evidence": "GS_SIGNATURE_116527_CONFIRMED"
  }
```
---

Satellite receives broadcasted command with parameters and sends back confirmation of understanding to the ground station.

Submit `SatelliteConfirmation` transaction:
```
  {
    "$class": "org.example.loc.SatelliteConfirmation",
    "loc": "resource:org.example.loc.ServiceRequest#REQUEST-REF-123",
    "evidence": "SAT_SIGNATURE_6853474_CONFIRMED"
  }
```
---

Satellite has performed the required work and it’s broadcasting the results to the nearest ground station. Ground station receives data from satellite, saves confirmation to the blockchain and uploads data to the Hermes Cloud.


Submit `GroundStationDownload` transaction:
```
  {
    "$class": "org.example.loc.GroundStationDownload",
    "loc": "resource:org.example.loc.ServiceRequest#REQUEST-REF-123",
    "evidence": "GS_SIGNATURE_116527_RECEIVING_DOWNLOADING",
    "requestedData": "[{data: 011010000110010101110010011011010110010101110011}]"
  }
```
---

Data are available for customer in Hermes Cloud and service is ready for payment.

Submit `ReadyForPayment` transaction:
```
  {
    "$class": "org.example.loc.ReadyForPayment",
    "loc": "resource:org.example.loc.ServiceRequest#REQUEST-REF-123"
  }
```
---

Request of service is complete.

Submit `Close` transaction:
```
  {
    "$class": "org.example.loc.Close",
    "loc": "resource:org.example.loc.ServiceRequest#REQUEST-REF-123",
    "closeReason": "ISSUED_AND_COMPLETED"
  }
```