// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from "firebase/firestore";
import { getFirestore, getDoc, setDoc, doc, query as firestoreQuery, limit, getDocs, collection, orderBy, startAt, endAt, where, GeoPoint } from "firebase/firestore";
import {setPersistence,browserLocalPersistence} from "firebase/auth";
import { getDatabase, ref, set, push, onValue, off, query, orderByChild, limitToLast } from "firebase/database";


// import auth stuff
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCGZtHGku5uPMGhU8DZ_0r1gLyhOlKiQHU",
    authDomain: "bartr-c35a7.firebaseapp.com",
    databaseURL: "https://bartr-c35a7-default-rtdb.firebaseio.com",
    projectId: "bartr-c35a7",
    storageBucket: "bartr-c35a7.firebasestorage.app",
    messagingSenderId: "663587878943",
    appId: "1:663587878943:web:c7d96a6eb01b0f8a793d2a",
    measurementId: "G-PRCBM93CR8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const firestoreDB = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() })
});
const realtimeDB = getDatabase(app);

function addChatButton(listItem, match) {
    // Only add chat button if chatroomId exists
    if (match.chatroomId) {
        // Create a chat button
        const chatBtn = document.createElement("button");
        chatBtn.className = "btn btn-sm btn-primary mt-2";
        chatBtn.innerHTML = '<i class="bi bi-chat-dots"></i> Chat';
        chatBtn.addEventListener("click", () => openChatModal(match));

        // Add to the list item
        const statusBadge = listItem.querySelector(".badge");
        if (statusBadge) {
            const buttonContainer = document.createElement("div");
            buttonContainer.className = "d-flex align-items-center gap-2 mt-2";
            buttonContainer.appendChild(statusBadge.cloneNode(true));
            statusBadge.remove();
            buttonContainer.appendChild(chatBtn);

            const infoSection = listItem.querySelector(".ps-5");
            infoSection.appendChild(buttonContainer);
        } else {
            const infoSection = listItem.querySelector(".ps-5");
            infoSection.appendChild(chatBtn);
        }
    }
}
function openChatModal(match) {
    const chatModal = new bootstrap.Modal(document.getElementById("chatModal"));
    const chatroomId = match.chatroomId;

    // Set the chat partner name based on whether user is sponsor or dependent
    const chatPartnerName = document.getElementById("chatPartnerName");
    if (selfProfile.sponsor) {
        chatPartnerName.textContent = `${match.dependentPrefix ? match.dependentPrefix + ' ' : ''}${match.dependentName} ${match.dependentLastName}`;
    } else {
        chatPartnerName.textContent = match.sponsorName;
    }

    // Store the current chatroom ID
    document.getElementById("currentChatroomId").value = chatroomId;

    // Clear existing messages
    document.getElementById("chatMessages").innerHTML = "";

    // Load chat messages
    loadChatMessages(chatroomId);

    // Show the modal
    chatModal.show();

    // Focus on the input field
    document.getElementById("chatInput").focus();
}

// Function to load chat messages
function loadChatMessages(chatroomId) {
    const messagesRef = ref(realtimeDB, `chatrooms/${chatroomId}/messages`);
    const messagesQuery = firestoreQuery(messagesRef, orderByChild('timestamp'), limitToLast(50));

    // Remove any existing listeners
    off(messagesQuery);

    // Listen for messages
    onValue(messagesQuery, (snapshot) => {
        const chatMessages = document.getElementById("chatMessages");
        chatMessages.innerHTML = "";

        if (snapshot.exists()) {
            const messages = snapshot.val();

            // Convert to array and sort by timestamp
            const messageArray = Object.entries(messages).map(([id, message]) => ({
                id,
                ...message
            }));

            messageArray.sort((a, b) => a.timestamp - b.timestamp);

            // Render each message
            messageArray.forEach(message => {
                const messageElement = document.createElement("div");
                messageElement.className = "chat-message-container";

                const bubble = document.createElement("div");

                // Determine message type
                if (message.sender === "system") {
                    bubble.className = "message message-system";
                } else if (message.sender === auth.currentUser.uid) {
                    bubble.className = "message message-sent";
                } else {
                    bubble.className = "message message-received";
                }

                bubble.textContent = message.text;

                const timestamp = document.createElement("div");
                timestamp.className = "message-time";
                timestamp.textContent = new Date(message.timestamp).toLocaleString();

                messageElement.appendChild(bubble);
                messageElement.appendChild(timestamp);
                chatMessages.appendChild(messageElement);
            });

            // Scroll to the bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });
}

// Function to send a message
function sendMessage() {
    const chatroomId = document.getElementById("currentChatroomId").value;
    const messageText = document.getElementById("chatInput").value.trim();

    if (messageText && chatroomId) {
        const messagesRef = ref(realtimeDB, `chatrooms/${chatroomId}/messages`);
        const newMessageRef = push(messagesRef);

        set(newMessageRef, {
            text: messageText,
            timestamp: Date.now(),
            sender: auth.currentUser.uid
        });

        // Update last message
        const lastMessageRef = ref(realtimeDB, `chatrooms/${chatroomId}/lastMessage`);
        set(lastMessageRef, {
            text: messageText,
            timestamp: Date.now(),
            sender: auth.currentUser.uid
        });

        // Clear the input
        document.getElementById("chatInput").value = "";
    }
}

// Event listener for send button
document.getElementById("sendMessageBtn").addEventListener("click", sendMessage);

// Event listener for enter key in chat input
document.getElementById("chatInput").addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

// Close chat listeners when modal is closed
document.getElementById("chatModal").addEventListener("hidden.bs.modal", () => {
    const chatroomId = document.getElementById("currentChatroomId").value;
    if (chatroomId) {
        const messagesRef = ref(realtimeDB, `chatrooms/${chatroomId}/messages`);
        off(messagesRef);
    }
});


// init auth
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
    });

let map = null;

function init() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            try {
                // Initialize the map
                if (!map) {
                    map = L.map('listings-map').setView([lat, lon], 11);
                    // Add the OpenStreetMap tile layer
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    }).addTo(map);

                    // Add marker for user's current position
                    L.marker([lat, lon], {
                        icon: L.divIcon({
                            className: 'user-location-marker',
                            html: '<div class="pulse"></div>',
                            iconSize: [15, 15]
                        })
                    }).addTo(map)
                        .bindPopup('Your location')
                        .openPopup();
                }

                const nearbyUsers = await getDocumentsInRadius(lat, lon, 25);
                console.log("Nearby Users:", nearbyUsers);

                // Group users by geohash
                const usersByGeohash = {};
                nearbyUsers.forEach(user => {
                    const geohash = user.approximate_geo_hash;
                    if (!usersByGeohash[geohash]) {
                        usersByGeohash[geohash] = {
                            users: [],
                            location: user.approximate_location
                        };
                    }
                    usersByGeohash[geohash].users.push(user);
                });

                // Create markers for each geohash
                Object.entries(usersByGeohash).forEach(([geohash, data]) => {
                    const { users, location } = data;
                    const { latitude, longitude } = decode(geohash);

                    // Create marker with count
                    const markerIcon = L.divIcon({
                        className: 'geohash-marker',
                        html: `<div class="geohash-pin"><span>${users.length}</span></div>`,
                        iconSize: [40, 40],
                        iconAnchor: [20, 40]
                    });

                    const marker = L.marker([latitude, longitude], {
                        icon: markerIcon,
                        title: location
                    }).addTo(map);

                    // Create popup content with all users in this geohash
                    let popupContent = `
                    <div class="geohash-popup-header">
                        <h5>${users.length} ${users.length === 1 ? 'user' : 'users'} at this location</h5>
                        <p>Distance: ${users[0].distance.toFixed(2)} km away</p>
                    </div>
                    <div class="geohash-listings">
                `;

                    let count = 1;
                    users.forEach(user => {
                        let buttonCode = '';
                        // check if the sponsor id exists in any of matches or pending
                        const alreadyRequested = pending.some(req => req.sponsorId === user.owner_uid);
                        const alreadyMatched = matches.some(req => req.sponsorId === user.owner_uid);
                        const alreadyRejected = rejected.some(req => req.sponsorId === user.owner_uid);
                        if (alreadyRequested) {
                            buttonCode = '<span class="badge bg-warning text-dark">Request Pending</span>';
                        } else if (alreadyMatched) {
                            buttonCode = '<span class="badge bg-success">Matched</span>';
                        } else if (alreadyRejected) {
                            buttonCode = '<span class="badge bg-danger">Request Declined</span>';
                        } else {
                            buttonCode = user.owner_uid ? `<button class="btn btn-sm btn-primary contact-btn" 
                                data-user-id="${user.owner_uid}">Request</button>` : '';
                        }
                        popupContent += `
                        <div class="listing-item">
                            <span><strong>Sponsor ${count}</strong> (${user.approximate_location})</span>
                            <p></p>
                            ${buttonCode}
                        </div>
                        <hr>
                    `;
                        count++;
                    });

                    popupContent += `</div>`;

                    // Bind popup to marker
                    marker.bindPopup(popupContent, {
                        maxWidth: 300,
                        maxHeight: 300,
                        className: 'geohash-popup'
                    });

                    // Add click handler for contact buttons
                    marker.on('popupopen', () => {
                        setTimeout(() => {
                            document.querySelectorAll('.contact-btn').forEach(btn => {
                                btn.addEventListener('click', (e) => {
                                    const sponsorId = e.target.getAttribute('data-user-id');

                                    // Store the sponsor ID in the hidden field
                                    document.getElementById('requestSponsorId').value = sponsorId;

                                    // Show the request modal
                                    const requestModal = new bootstrap.Modal(document.getElementById('requestModal'));
                                    requestModal.show();
                                });
                            });
                        }, 100);
                    });
                });


                // Add styling
                const style = document.createElement('style');
                document.head.appendChild(style);

            } catch (error) {
                console.error("Error setting up map:", error);
            }
        });
    }

}

let selfProfile = null;
let pending = [];
let matches = [];
let rejected = [];

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const signInButton = document.getElementById("sign-in-button");
        const getStartedButton = document.getElementById("get-started-button");
        // hide the get started button
        getStartedButton.style.display = "none";

        // get the document of the user
        const usersCollection = collection(firestoreDB, "users");
        const userDoc = doc(usersCollection, user.uid);
        // now get the data
        let userData = await getDoc(userDoc);
        selfProfile = userData.data();
        console.log("User data:", selfProfile);

        const requestsCollection = collection(firestoreDB, "requests");
        let field = "";
        if (selfProfile.sponsor) {
            field = "sponsorId";
        } else {
            field = "dependentId";
        }
        const requestsQuery = query(requestsCollection, where(field, "==", user.uid));
        const requestsSnapshot = await getDocs(requestsQuery);
        requestsSnapshot.forEach((doc) => {
            let requestData = doc.data();
            requestData.id = doc.id;
            if (requestData.status === "pending") {
                pending.push(requestData);
            } else if (requestData.status === "accepted") {
                matches.push(requestData);
            } else {
                rejected.push(requestData);
            }
        });

        console.log("Pending requests:", pending);
        console.log("Matched requests:", matches);
        console.log("Rejected requests:", rejected);

        // make the button a sign out button
        signInButton.textContent = "Sign Out";
        document.getElementById("sign-in-button").addEventListener("click", () => {
            auth.signOut().then(() => {
                // Sign-out successful.
                window.alert("Sign Out Successful");
                window.location.reload();
            }).catch((error) => {
                // An error happened.
                console.error("Error signing out:", error);
            });
        });

        init();

        const requestList = document.getElementById("requestsList");
        const dependentsList = document.getElementById("dependentsList");
        if (selfProfile.sponsor) {
            // fill with approved requests first
            for (const match of matches) {
                const listItem = document.createElement("li");
                listItem.className = "list-group-item d-flex justify-content-between align-items-center";
                listItem.innerHTML = `
        <div class="matched-dependent">
            <div class="d-flex align-items-center mb-2">
                <div class="user-icon bg-primary text-white me-2 rounded-circle d-flex justify-content-center align-items-center" 
                     style="width: 40px; height: 40px; font-size: 18px;">
                    ${match.dependentPrefix ? match.dependentPrefix[0] : match.dependentName[0]}
                </div>
                <h5 class="mb-0">${match.dependentPrefix ? match.dependentPrefix + ' ' : ''}${match.dependentName} ${match.dependentLastName}</h5>
            </div>
            <div class="ps-5">
                <div class="mb-2">
                    <i class="bi bi-geo-alt text-primary me-1"></i>
                    <strong>Pickup Location:</strong>
                </div>
                <p class="ms-4 text-muted border-start border-primary ps-2">${match.pickupLocation}</p>
                <span class="badge bg-success"><i class="bi bi-check-circle me-1"></i> Approved</span>
            </div>
        </div>
    `;
                dependentsList.appendChild(listItem);

                // Add chat button after the list item is created
                addChatButton(listItem, match);
            }
            // then fill with pending requests
            for (const request of pending) {
                const listItem = document.createElement("li");
                listItem.className = "list-group-item d-flex justify-content-between align-items-start";

                // Check if user is a sponsor (only sponsors can approve/reject)
                const actionButtons = selfProfile.sponsor ? `
                <div class="ms-auto">
                    <button class="btn btn-success btn-sm me-1 approve-btn" data-request-id="${request.id}">
                        <i class="bi bi-check-lg"></i> Approve
                    </button>
                    <button class="btn btn-danger btn-sm reject-btn" data-request-id="${request.id}">
                        <i class="bi bi-x-lg"></i> Decline
                    </button>
                </div>
            ` : '';

                listItem.innerHTML = `
                <div class="me-auto">
                    <h5 class="mb-2">Pending Request</h5>
                    <div class="mb-2">
                        <strong>Pickup Location:</strong> 
                        <p class="text-muted mb-1">${request.pickupLocation}</p>
                    </div>
                    <span class="badge bg-warning text-dark">Awaiting Approval</span>
                </div>
                ${actionButtons}
            `;

                requestList.appendChild(listItem);
            }
        } else {

        }
    } else {
        // Open Sign In Modal when "Sign In" button is clicked
        document.getElementById("sign-in-button").addEventListener("click", () => {
            const signInModal = new bootstrap.Modal(document.getElementById("signInModal"));
            signInModal.show();
        });

        init();
    }
});

// geocode stuff
import { decode, encode, neighbors } from "ngeohash";

async function geocodeAddress(address) {
    const params = new URLSearchParams({
        q: address,
        format: "json",
        addressdetails: "1",
        limit: "1",
        email: "thelolimeisterchannel@gmail.com" // Required by Nominatim usage policy
    });

    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: {
            "User-Agent": "MailBankApp/1.0 (thelolimeisterchannel@gmail.com)"
        }
    });

    const data = await res.json();
    if (!data.length) throw new Error("Address not found.");
    return data[0]; // includes lat, lon, and address components
}

function extractGeneralArea(address) {
    return (
        address.suburb ||
        address.neighbourhood ||
        address.city_district ||
        address.town ||
        address.city ||
        address.state ||
        "General Area"
    );
}

async function createPublicLocationFromAddress(fullAddress) {
    const data = await geocodeAddress(fullAddress);

    const trueLat = parseFloat(data.lat);
    const trueLon = parseFloat(data.lon);
    const areaName = extractGeneralArea(data.address);

    const geoHash = encode(trueLat, trueLon, 6); // Precision 5 is good
    console.log(geoHash);

    return {
        private: {
            fullAddress: fullAddress,
            trueLat,
            trueLon
        },
        public: {
            areaName,
            geohash: geoHash,
            radiusMeters: 5000 // Approximate radius for precision 5
        }
    };
}

function distanceBetween([lat1, lon1], [lat2, lon2]) {
    const R = 6371e3; // Earth's radius in meters
    const toRadians = (degrees) => degrees * (Math.PI / 180);

    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

async function getDocumentsInRadius(centerLat, centerLng, radiusInKm) {
    const center = [centerLat, centerLng];
    const collectionRef = collection(firestoreDB, 'listings');

    // Calculate geohash precision based on radius
    // Use precision 6 for smaller radius, 5 for larger
    const precision = radiusInKm <= 10 ? 6 : 5;

    // Get center geohash at appropriate precision
    const centerHash = encode(centerLat, centerLng, precision);

    // For precision 6, we need more neighbors to ensure coverage
    let geohashesToQuery = [centerHash];

    if (precision === 6) {
        // Get immediate neighbors
        const immediateNeighbors = neighbors(centerHash);
        geohashesToQuery.push(...immediateNeighbors);

        // Get second-level neighbors for better coverage
        immediateNeighbors.forEach(neighbor => {
            const secondaryNeighbors = neighbors(neighbor);
            secondaryNeighbors.forEach(secondary => {
                if (!geohashesToQuery.includes(secondary)) {
                    geohashesToQuery.push(secondary);
                }
            });
        });
    } else {
        // For precision 5, standard neighbors are sufficient
        geohashesToQuery.push(...neighbors(centerHash));
    }

    // Create queries for all geohashes
    const queries = geohashesToQuery.map(prefix =>
        query(
            collectionRef,
            orderBy('approximate_geo_hash'),
            startAt(prefix),
            endAt(prefix + '\uf8ff')
        )
    );

    const matchingDocs = [];
    const querySnapshots = await Promise.all(queries.map(q => getDocs(q)));

    // Process results
    querySnapshots.forEach(snap => {
        snap.forEach(doc => {
            const data = doc.data();
            const { latitude: docLat, longitude: docLng } = decode(data.approximate_geo_hash);

            // Calculate distance
            const distance = distanceBetween([docLat, docLng], center); // meters
            if (distance <= radiusInKm * 1000) {
                matchingDocs.push({
                    id: doc.id,
                    distance: distance / 1000,
                    ...data
                });
            }
        });
    });

    return matchingDocs;
}

async function getBearerToken() {
    const user = auth.currentUser;

    if (!user) {
        throw new Error("User is not logged in");
    }

    return await user.getIdToken();
}

function decodeBoundingBox(geohash) {
    const { latitude, longitude, error } = decode(geohash);

    // Calculate the bounding box corners
    return [
        [latitude - error.latitude, longitude - error.longitude], // Southwest corner
        [latitude + error.latitude, longitude + error.longitude]  // Northeast corner
    ];
}

// Add event listener for request confirmation
document.getElementById('confirmRequest').addEventListener('click', async () => {
    if (!auth.currentUser) {
        alert("Please sign in to send a request");

        // Hide the request modal
        bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();

        // Show the sign in modal
        const signInModal = new bootstrap.Modal(document.getElementById('signInModal'));
        signInModal.show();
        return;
    }

    const sponsorId = document.getElementById('requestSponsorId').value;
    const pickupLocationInput = document.getElementById('pickupLocation');
    const pickupLocation = pickupLocationInput.value.trim();

    // Validate pickup location
    if (!pickupLocation) {
        pickupLocationInput.classList.add('is-invalid');
        return;
    } else {
        pickupLocationInput.classList.remove('is-invalid');
    }

    try {
        // Create a request document in Firestore
        const requestsCollection = collection(firestoreDB, "requests");

        const requestData = {
            sponsorId: sponsorId,
            dependentId: auth.currentUser.uid,
            pickupLocation: pickupLocation,
            status: "pending", // pending, accepted, rejected
            createdAt: new Date()
        };

        // Add the request to Firestore
        await setDoc(doc(requestsCollection), requestData);

        // Close the modal
        bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();

        // Show success message
        alert("Your request has been sent! You will be notified when the sponsor responds.");
    } catch (error) {
        console.error("Error sending request:", error);
        alert("Failed to send request. Please try again.");
    }
});

// Clear the form when the modal is closed
document.getElementById('requestModal').addEventListener('hidden.bs.modal', () => {
    document.getElementById('pickupLocation').value = '';
    document.getElementById('requestSponsorId').value = '';
});

document.getElementById("providingMailbox").addEventListener("change", () => {
    document.getElementById("addressFields").classList.remove("d-none");
});

document.getElementById("needingMailbox").addEventListener("change", () => {
    document.getElementById("addressFields").classList.add("d-none");
});

document.getElementById("get-started-button").addEventListener("click", () => {
    const signUpModal = new bootstrap.Modal(document.getElementById("signUpModal"));
    signUpModal.show();
});

function removeErrorOnInput(input) {
    input.addEventListener("input", () => {
        input.classList.remove("is-invalid");
    });
}

// Helper function to remove error class on radio buttons
function removeErrorOnRadio(radioGroup) {
    radioGroup.forEach((radio) => {
        radio.addEventListener("change", () => {
            radioGroup.forEach((r) => r.classList.remove("is-invalid"));
        });
    });
}

// Apply the helper functions
document.addEventListener("DOMContentLoaded", () => {
    const nameInput = document.getElementById("signUpName");
    const emailInput = document.getElementById("signUpEmail");
    const passwordInput = document.getElementById("signUpPassword");
    const radioInputs = document.getElementsByName("mailboxOption");
    const addressLine1Input = document.getElementById("addressLine1");
    const cityInput = document.getElementById("city");
    const stateInput = document.getElementById("state");
    const zipCodeInput = document.getElementById("zipCode");
    const signInEmailInput = document.getElementById("signInEmail");
    const signInPasswordInput = document.getElementById("signInPassword");
    const lastNameInput = document.getElementById("signUpLastName");

    removeErrorOnInput(nameInput);
    removeErrorOnInput(lastNameInput);
    removeErrorOnInput(emailInput);
    removeErrorOnInput(passwordInput);
    removeErrorOnRadio(radioInputs);

    removeErrorOnInput(addressLine1Input);
    removeErrorOnInput(cityInput);
    removeErrorOnInput(stateInput);
    removeErrorOnInput(zipCodeInput);

    removeErrorOnInput(signInEmailInput);
    removeErrorOnInput(signInPasswordInput);
});

document.getElementById("signInForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailInput = document.getElementById("signInEmail");
    const passwordInput = document.getElementById("signInPassword");
    const errorMessageDiv = document.getElementById("signInErrorMessage");

    let isValid = true;

    // Validation
    if (!emailInput.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
        emailInput.classList.add("is-invalid");
        isValid = false;
    } else {
        emailInput.classList.remove("is-invalid");
    }

    if (!passwordInput.value.trim()) {
        passwordInput.classList.add("is-invalid");
        isValid = false;
    } else {
        passwordInput.classList.remove("is-invalid");
    }

    if (!isValid) return;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        errorMessageDiv.textContent = ""; // Clear any previous error message
        // hide the sign in modal
        const modal = bootstrap.Modal.getInstance(document.getElementById("signInModal"));
        modal.hide();
    } catch (error) {
        console.error("Error signing in:", error);
        errorMessageDiv.textContent = "Failed to sign in. Please check your credentials.";
        errorMessageDiv.classList.remove("d-none");
    }
});
/*
Structure of a profile
uid: {
    name: string
    address: string
    sponsor: boolean
    approximate_location: string
    dependents: array of uids
    hoster: uid
 */
document.querySelector("#signUpForm").addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent form submission

    // Collect form data
    const nameInput = document.getElementById("signUpName");
    const emailInput = document.getElementById("signUpEmail");
    const passwordInput = document.getElementById("signUpPassword");
    const sponsor = document.getElementById("providingMailbox").checked;
    const addressLine1Input = document.getElementById("addressLine1");
    const addressLine2Input = document.getElementById("addressLine2");
    const cityInput = document.getElementById("city");
    const stateInput = document.getElementById("state");
    const zipCodeInput = document.getElementById("zipCode");
    const radioInputs = document.getElementsByName("mailboxOption");
    const radioGroup = document.querySelector("[name='mailboxOption']");
    const lastNameInput = document.getElementById("signUpLastName");
    const prefixInput = document.getElementById("namePrefix");


    let isValid = true;

    // Validation
    if (!nameInput.value.trim()) {
        nameInput.classList.add("is-invalid");
        isValid = false;
    } else {
        nameInput.classList.remove("is-invalid");
    }

    if (!lastNameInput.value.trim()) {
        lastNameInput.classList.add("is-invalid");
        isValid = false;
    } else {
        lastNameInput.classList.remove("is-invalid");
    }

    if (!emailInput.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
        emailInput.classList.add("is-invalid");
        isValid = false;
    } else {
        emailInput.classList.remove("is-invalid");
    }

    if (!passwordInput.value.trim() || passwordInput.value.length < 6) {
        passwordInput.classList.add("is-invalid");
        isValid = false;
    } else {
        passwordInput.classList.remove("is-invalid");
    }

    if (sponsor) {
        if (!addressLine1Input.value.trim()) {
            addressLine1Input.classList.add("is-invalid");
            isValid = false;
        } else {
            addressLine1Input.classList.remove("is-invalid");
        }

        if (!cityInput.value.trim()) {
            cityInput.classList.add("is-invalid");
            isValid = false;
        } else {
            cityInput.classList.remove("is-invalid");
        }

        if (!stateInput.value.trim()) {
            stateInput.classList.add("is-invalid");
            isValid = false;
        } else {
            stateInput.classList.remove("is-invalid");
        }

        if (!zipCodeInput.value.trim()) {
            zipCodeInput.classList.add("is-invalid");
            isValid = false;
        } else {
            zipCodeInput.classList.remove("is-invalid");
        }
    }

    const isRadioSelected = Array.from(radioInputs).some((radio) => radio.checked);
    if (!isRadioSelected) {
        radioGroup.classList.add("is-invalid");
        radioInputs[0].classList.add("is-invalid");
        isValid = false;
    } else {
        radioGroup.classList.remove("is-invalid");
        radioInputs.forEach((radio) => radio.classList.remove("is-invalid"));
    }

    if (!isValid) {
        return; // Stop submission if validation fails
    }

    // get the values
    const name = nameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const addressLine1 = addressLine1Input.value.trim();
    const addressLine2 = addressLine2Input.value.trim();
    const city = cityInput.value.trim();
    const state = stateInput.value.trim();
    const zipCode = zipCodeInput.value.trim();

    // Concatenate address fields
    const address = sponsor
        ? `${addressLine1}, ${city}, ${state}, ${zipCode}`
        : "";

    // Create user profile object
    let userProfile;
    let listingData;
    if (sponsor) {
        let processedAddr = await createPublicLocationFromAddress(address).catch((error) => {
            console.error("Error processing address:", error);
            alert("Failed to process address. Please ensure it's valid.");
            throw error;
        });

        userProfile = {
            first_name: name,
            last_name: lastName,
            prefix: prefixInput.value,
            address,
            sponsor,
            dependents: [],
        };
        listingData = {
            approximate_location: processedAddr.public.areaName,
            approximate_geo_hash: processedAddr.public.geohash,
        }
    } else {
        userProfile = {
            name,
            sponsor,
            hoster: null,
        };
        listingData = null;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        if (listingData != null) {
            listingData.owner_uid = userCredential.user.uid;
        }

        const userCollection = collection(firestoreDB, "users");
        if (listingData != null) {
            const listingsCollection = collection(firestoreDB, "listings");
            await setDoc(doc(listingsCollection, userCredential.user.uid), { ...listingData });
        }
        await setDoc(doc(userCollection, userCredential.user.uid), { ...userProfile });


        const modal = bootstrap.Modal.getInstance(document.getElementById("signUpModal"));
        modal.hide();
    } catch (error) {
        console.error("Error creating account:", error);
        alert("Failed to create account. Please try again.");
    }

});

// Add event listeners to approve/reject buttons after the requests are loaded
document.addEventListener('click', function(e) {
    // Handle approve button click
    if (e.target && e.target.classList.contains('approve-btn') ||
        (e.target.parentElement && e.target.parentElement.classList.contains('approve-btn'))) {
        const button = e.target.classList.contains('approve-btn') ? e.target : e.target.parentElement;
        const requestId = button.getAttribute('data-request-id');

        // Store the request ID in the hidden field
        document.getElementById('acceptRequestId').value = requestId;

        // Show the confirm modal
        const acceptModal = new bootstrap.Modal(document.getElementById('acceptConfirmModal'));
        acceptModal.show();
    }

    // Handle reject button click
    if (e.target && e.target.classList.contains('reject-btn') ||
        (e.target.parentElement && e.target.parentElement.classList.contains('reject-btn'))) {
        const button = e.target.classList.contains('reject-btn') ? e.target : e.target.parentElement;
        const requestId = button.getAttribute('data-request-id');

        // Store the request ID in the hidden field
        document.getElementById('declineRequestId').value = requestId;

        // Show the confirm modal
        const declineModal = new bootstrap.Modal(document.getElementById('declineConfirmModal'));
        declineModal.show();
    }
});

// Handle confirm decline button click
document.getElementById('confirmDecline').addEventListener('click', async function() {
    const requestId = document.getElementById('declineRequestId').value;

    try {
        const requestDoc = doc(firestoreDB, "requests", requestId);
        await setDoc(requestDoc, { status: "rejected", rejectedAt: new Date() }, { merge: true });

        // Close the modal
        bootstrap.Modal.getInstance(document.getElementById('declineConfirmModal')).hide();

        // Show success message
        alert("Request has been declined.");

        // Refresh the page to update the UI
        window.location.reload();
    } catch (error) {
        console.error("Error declining request:", error);
        alert("Failed to decline request. Please try again.");
    }
});

// Handle confirm accept button click
document.getElementById('confirmAccept').addEventListener('click', async function() {
    const requestId = document.getElementById('acceptRequestId').value;

    try {
        const requestDoc = doc(firestoreDB, "requests", requestId);
        await setDoc(requestDoc, { status: "accepted", acceptedAt: new Date() }, { merge: true });
        const token = await getBearerToken();

        const response = await fetch('/api/approve_request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                requestId,
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to approve request');
        }

        // Close the modal
        bootstrap.Modal.getInstance(document.getElementById('acceptConfirmModal')).hide();

        // Refresh the page to update the UI
        window.location.reload();
    } catch (error) {
        console.error("Error accepting request:", error);
        alert("Failed to accept request. Please try again.");
    }
});