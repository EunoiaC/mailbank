import admin from "firebase-admin";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();
const rtdb = admin.database();


export default async function approve_request(req, res) {
    if (req.method !== 'POST') {
        console.error("Method not allowed");
        return res.status(405).json({error: 'Method not allowed'});
    }

    // check auth header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.error('Unauthorized');
        return res.status(401).json({error: "Unauthorized"});
    }

    let { requestId } = req.body;

    if (!requestId) {
        console.error("Missing required fields");
        return res.status(401).json({ error: "Missing desiredMatchUID" });
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        let uid = decodedToken.uid;

        // get the request from firestore
        const requestDoc = await db.collection('requests').doc(requestId).get();
        if (!requestDoc.exists) {
            console.error("Request not found");
            return res.status(404).json({ error: "Request not found" });
        }
        const requestData = requestDoc.data();

        if (requestData.status !== "accepted") {
            console.error("Request not accepted");
            return res.status(400).json({ error: "Request not accepted" });
        }

        const sponsor = await db.collection('users').doc(requestData.sponsorId).get();
        const dependent = await db.collection('users').doc(requestData.dependentId).get();
        if (!sponsor.exists || !dependent.exists) {
            console.error("User not found");
            return res.status(404).json({ error: "User not found" });
        }

        let sponsorData = sponsor.data();
        let dependentData = dependent.data();

        // update the request to have the sponsor name and address
        await db.collection('requests').doc(requestId).update({
            sponsorName: sponsorData.first_name,
            sponsorAddress: sponsorData.address,
            dependentName: dependentData.first_name,
            dependentPrefix: dependentData.prefix,
            dependentLastName: dependentData.last_name,
        });

        const chatroomId = `${requestData.sponsorId}-${requestData.dependentId}`;
        const chatroomRef = rtdb.ref(`chatrooms/${chatroomId}`);

        await chatroomRef.set({
            participants: {
                [requestData.sponsorId]: true,
                [requestData.dependentId]: true
            },
            createdAt: admin.database.ServerValue.TIMESTAMP,
            requestId: requestId,
            sponsorName: sponsorData.first_name,
            dependentName: dependentData.first_name,
            lastMessage: {
                text: "Chat created. You can now communicate securely.",
                timestamp: admin.database.ServerValue.TIMESTAMP,
                sender: "system"
            }
        });

        // Add initial welcome message
        const messagesRef = rtdb.ref(`chatrooms/${chatroomId}/messages`);
        await messagesRef.push({
            text: "Welcome! You can now communicate securely about mail pickup and delivery.",
            timestamp: admin.database.ServerValue.TIMESTAMP,
            sender: "system"
        });

        // Update the request with the chatroom ID
        await db.collection('requests').doc(requestId).update({
            chatroomId: chatroomId
        });

        return res.status(200).json({});
    } catch (error) {
        console.error("Error verifying token:", error);
        return res.status(401).json({ error: "Invalid token" });
    }
}