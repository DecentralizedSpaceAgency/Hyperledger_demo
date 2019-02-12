/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/* global getFactory getAssetRegistry getParticipantRegistry emit */

/**
 * Create the LOC asset
 * @param {org.example.loc.InitialApplication} initalAppliation - the InitialApplication transaction
 * @transaction
 */
async function initialApplication(application) { // eslint-disable-line no-unused-vars
    const factory = getFactory();
    const namespace = 'org.example.loc';

    const request = factory.newResource(namespace, 'ServiceRequest', application.requestId);
    request.applicant = factory.newRelationship(namespace, 'Customer', application.applicant.getIdentifier());
    request.beneficiary = factory.newRelationship(namespace, 'Company', application.beneficiary.getIdentifier());
    request.issuingSatellite = factory.newRelationship(namespace, 'Satellite', application.issuingSatellite.getIdentifier());
    request.requestDetails = application.requestDetails;
    request.evidence = [];
    request.requestedData = [];
    request.status = 'AWAITING_APPROVAL';

    //save the application
    const assetRegistry = await getAssetRegistry(request.getFullyQualifiedType());
    await assetRegistry.add(request);

    // emit event
    const applicationEvent = factory.newEvent(namespace, 'InitialApplicationEvent');
    applicationEvent.loc = request;
    emit(applicationEvent);
}

/**
 * Update the LOC to show that it has been approved by a given person
 * @param {org.example.loc.approveRequest} approveRequest - the Approve transaction
 * @transaction
 */
async function approveRequest(approveRequest) { // eslint-disable-line no-unused-vars
    const factory = getFactory();
    const namespace = 'org.example.loc';

    let request = approveRequest.loc;

    if (request.status === 'CLOSED' || request.status === 'REJECTED') {
        throw new Error ('This request of service has already been closed');
    } else if (approveRequest.approvingParty.getType() === 'Regulator') {
        if (request.applicant.countryOfOrigin === "USA") {
            request.issuingSatellite.excludedCountries.forEach((excCountry) => {
                let isExcluded = false;
                try {
                    isExcluded = excCountry ? excCountry == request.requestDetails.targetCountry : false;
                } catch (err) {
                    //...
                }

                if (isExcluded) {
                    request.status = 'REJECTED';
                    throw new Error ('Requesting excluded services');
                } else {
                    request.status = 'APPROVED';
                }
            })
        } else {
            request.status = 'APPROVED';
        }
    }

    // update approval[]
    const assetRegistry = await getAssetRegistry(approveRequest.loc.getFullyQualifiedType());
    await assetRegistry.update(request);

    // emit event
    const approveEvent = factory.newEvent(namespace, 'approveRequestEvent');
    approveEvent.loc = approveRequest.loc;
    approveEvent.approvingParty = approveRequest.approvingParty;
    emit(approveEvent);
}

/**
 * Reject the LOC
 * @param {org.example.loc.RejectRequest} rejectRequest - the Reject transaction
 * @transaction
 */
async function rejectRequest(rejectRequest) { // eslint-disable-line no-unused-vars
    const factory = getFactory();
    const namespace = 'org.example.loc';

    let request = rejectRequest.loc;

    if (request.status === 'CLOSED' || request.status === 'REJECTED') {
        throw new Error('This request of service has already been closed');
    } else if (request.status === 'APPROVED') {
        throw new Error('This request of service has already been approved');
    } else {
        request.status = 'REJECTED';
        request.closeReason = rejectRequest.closeReason;

        // update the status of the LOC
        const assetRegistry = await getAssetRegistry(rejectRequest.loc.getFullyQualifiedType());
        await assetRegistry.update(request);

        // emit event
        const rejectEvent = factory.newEvent(namespace, 'RejectRequestEvent');
        rejectEvent.loc = rejectRequest.loc;
        rejectEvent.closeReason = rejectRequest.closeReason;
        emit(rejectEvent);
    }    
}

/**
 * "Ship" the product
 * @param {org.example.loc.SendToGroundStation} sendToGroundStation - the ShipProduct transaction
 * @transaction
 */
async function sendToGroundStation(sendToGroundStation) { // eslint-disable-line no-unused-vars
    const factory = getFactory();
    const namespace = 'org.example.loc';

    let request = sendToGroundStation.loc;

    if (request.status === 'APPROVED') {
        request.status = 'SEND_TO_STATION';
        request.evidence.push(sendToGroundStation.evidence);

        // update the status of the loc
        const assetRegistry = await getAssetRegistry(sendToGroundStation.loc.getFullyQualifiedType());
        await assetRegistry.update(request);

        // emit event
        const receiveEvent = factory.newEvent(namespace, 'SendToGroundStationEvent');
        receiveEvent.loc = sendToGroundStation.loc;
        emit(receiveEvent);
    } else if (request.status === 'AWAITING_APPROVAL'){
        throw new Error('The request needs to be approved before it can be processed');
    } else if (request.status === 'CLOSED' || request.status === 'REJECTED') {
        throw new Error ('This request of service has already been closed');
    }
}

/**
 * "Recieve" the product that has been "shipped"
 * @param {org.example.loc.ReceivedByGroundStation} receivedByGroundStation - the ReceiveProduct transaction
 * @transaction
 */
async function receivedByGroundStation(receivedByGroundStation) { // eslint-disable-line no-unused-vars
    const factory = getFactory();
    const namespace = 'org.example.loc';

    let request = receivedByGroundStation.loc;

    if (request.status === 'SEND_TO_STATION') {
        request.status = 'RECEIVED_BY_STATION';
        request.evidence.push(receivedByGroundStation.evidence);

        // update the status of the loc
        const assetRegistry = await getAssetRegistry(receivedByGroundStation.loc.getFullyQualifiedType());
        await assetRegistry.update(request);

        // emit event
        const receiveEvent = factory.newEvent(namespace, 'ReceivedByGroundStationEvent');
        receiveEvent.loc = receivedByGroundStation.loc;
        emit(receiveEvent);
    } else if (request.status === 'APPROVED'){
        throw new Error('Needs to be processed by authorized ground station');
    } else if (request.status === 'CLOSED' || request.status === 'REJECTED') {
        throw new Error ('This request of service has already been closed');
    }
}

/**
 * "Recieve" the product that has been "shipped"
 * @param {org.example.loc.SatelliteConfirmation} satelliteConfirmation - the ReceiveProduct transaction
 * @transaction
 */
async function satelliteConfirmation(satelliteConfirmation) { // eslint-disable-line no-unused-vars
    const factory = getFactory();
    const namespace = 'org.example.loc';

    let request = satelliteConfirmation.loc;

    if (request.status === 'RECEIVED_BY_STATION') {
        request.status = 'SATELLITE_CONFIRMATION';
        request.evidence.push(satelliteConfirmation.evidence);

        // update the status of the loc
        const assetRegistry = await getAssetRegistry(satelliteConfirmation.loc.getFullyQualifiedType());
        await assetRegistry.update(request);

        // emit event
        const receiveEvent = factory.newEvent(namespace, 'SatelliteConfirmationEvent');
        receiveEvent.loc = satelliteConfirmation.loc;
        emit(receiveEvent);
    } 
}

/**
 * "Recieve" the product that has been "shipped"
 * @param {org.example.loc.GroundStationDownload} groundStationDownload - the ReceiveProduct transaction
 * @transaction
 */
async function groundStationDownload(groundStationDownload) { // eslint-disable-line no-unused-vars
    const factory = getFactory();
    const namespace = 'org.example.loc';

    let request = groundStationDownload.loc;

    if (request.status === 'SATELLITE_CONFIRMATION') {
        request.status = 'RECEIVING_DATA';
        request.evidence.push(groundStationDownload.evidence);
        request.requestedData.push(groundStationDownload.requestedData);

        // update the status of the loc
        const assetRegistry = await getAssetRegistry(groundStationDownload.loc.getFullyQualifiedType());
        await assetRegistry.update(request);

        // emit event
        const receiveEvent = factory.newEvent(namespace, 'GroundStationDownloadEvent');
        receiveEvent.loc = groundStationDownload.loc;
        emit(receiveEvent);
    } 
}

/**
 * Mark a given letter as "ready for payment"
 * @param {org.example.loc.ReadyForPayment} readyForPayment - the ReadyForPayment transaction
 * @transaction
 */
async function readyForPayment(paymentRequest) { // eslint-disable-line no-unused-vars
    const factory = getFactory();
    const namespace = 'org.example.loc';

    let request = paymentRequest.loc;

    if (request.status === 'RECEIVING_DATA') {
        request.status = 'READY_FOR_PAYMENT';

        // update the status of the loc
        const assetRegistry = await getAssetRegistry(paymentRequest.loc.getFullyQualifiedType());
        await assetRegistry.update(request);

        // emit event
        const receiveEvent = factory.newEvent(namespace, 'ReadyForPaymentEvent');
        receiveEvent.loc = paymentRequest.loc;
        emit(receiveEvent);
    }
}

/**
 * Close the LOC
 * @param {org.example.loc.Close} close - the Close transaction
 * @transaction
 */
async function close(closeRequest) { // eslint-disable-line no-unused-vars
    const factory = getFactory();
    const namespace = 'org.example.loc';

    let request = closeRequest.loc;

    if (request.status === 'READY_FOR_PAYMENT') {
        request.status = 'CLOSED';
        request.closeReason = closeRequest.closeReason;

        // update the status of the loc
        const assetRegistry = await getAssetRegistry(closeRequest.loc.getFullyQualifiedType());
        await assetRegistry.update(request);

        // emit event
        const receiveEvent = factory.newEvent(namespace, 'CloseEvent');
        receiveEvent.loc = closeRequest.loc;
        receiveEvent.closeReason = closeRequest.closeReason;
        emit(receiveEvent);
    }
}

/**
 * Create the participants needed for the demo
 * @param {org.example.loc.CreateDemoParticipants} createDemoParticipants - the CreateDemoParticipants transaction
 * @transaction
 */
async function createDemoParticipants() { // eslint-disable-line no-unused-vars
    const factory = getFactory();
    const namespace = 'org.example.loc';

    //create ground stations
    const gsRegistry = await getParticipantRegistry(namespace + '.GroundStation');
    const groundStation1 = factory.newResource(namespace, 'GroundStation', 'GS1');
    groundStation1.name = 'GS New Zeland';
    await gsRegistry.add(groundStation1);
    const groundStation2 = factory.newResource(namespace, 'GroundStation', 'GS2');
    groundStation2.name = 'GS London';
    await gsRegistry.add(groundStation2);

    //create satellites
    const satelliteRegistry = await getParticipantRegistry(namespace + '.Satellite');
    const satellite1 = factory.newResource(namespace, 'Satellite', 'ESA1');
    satellite1.name = 'ESA SAT 1';
    satellite1.excludedCountries = ["KLDR", "CHINA", "ISRAEL"];
    await satelliteRegistry.add(satellite1);
    const satellite2 = factory.newResource(namespace, 'Satellite', 'PLANET2');
    satellite2.name = 'PLANET.COM';
    satellite2.excludedCountries = ["KLDR", "CHINA", "ISRAEL"];
    await satelliteRegistry.add(satellite2);

    //create provider company
    const providerRegistry = await getParticipantRegistry(namespace + '.Company');
    const provider1 = factory.newResource(namespace, 'Company', 'ESA');
    provider1.name = 'European Space Agency';
    provider1.lastName = "EU";
    provider1.countryOfOrigin = "France";
    provider1.companyName = 'European Space Agency';
    provider1.satellite = factory.newRelationship(namespace, 'Satellite', 'ESA1');
    await providerRegistry.add(provider1);

    //create customer
    const customerRegistry = await getParticipantRegistry(namespace + '.Customer');
    const customer = factory.newResource(namespace, 'Customer', 'Startup');
    customer.name = "Star";
    customer.lastName = "Startup";
    customer.countryOfOrigin = "USA";
    await customerRegistry.add(customer);

    //create regulator
    const regulatorRegistry = await getParticipantRegistry(namespace + '.Regulator');
    const regulator = factory.newResource(namespace, 'Regulator', 'EU');
    regulator.name = "European";
    regulator.lastName = "Union";
    regulator.countryOfOrigin = "Bruxelles";
    await regulatorRegistry.add(regulator);
}