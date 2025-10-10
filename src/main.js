// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from "firebase/firestore";
import { getFirestore, addDoc, query, limit, getDocs, collection, orderBy, startAt, endAt, where, GeoPoint } from "firebase/firestore";
import { geohashQueryBounds, distanceBetween } from 'geofire-common';

// import auth stuff
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

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

// init auth
const auth = getAuth(app);

async function getDocumentsInRadius(centerLat, centerLng, radiusInKm) {
    const center = [centerLat, centerLng];
    const collectionRef = collection(firestoreDB, 'listings');

    // Calculate the geohash query boundaries
    const bounds = geohashQueryBounds(center, radiusInKm * 1000); // radius must be in meters

    const matchingDocs = [];

    // Perform multiple queries (one for each boundary)
    for (const b of bounds) {
        const q = query(
            collectionRef,
            orderBy('geohash'),
            startAt(b[0]),
            endAt(b[1])
        );

        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
            const data = doc.data();
            const { location } = data;

            // Filter results by exact distance
            // You must calculate the exact distance to exclude corner documents outside the radius.
            const distance = distanceBetween(
                [location.latitude, location.longitude],
                center
            ); // distance is in meters

            if (distance <= radiusInKm * 1000) {
                matchingDocs.push({ id: doc.id, distance: distance / 1000, ...data });
            }
        });
    }

    return matchingDocs;
}

document.getElementById("grid-view-button").addEventListener("click", () => {
    document.getElementById("grid-view-button").classList.add("active");
    document.getElementById("globe-view-button").classList.remove("active");
    document.getElementById("listings-grid").style.display = "block";
    document.getElementById("listings-map").style.display = "none";
});

document.getElementById("globe-view-button").addEventListener("click", () => {
    document.getElementById("globe-view-button").classList.add("active");
    document.getElementById("grid-view-button").classList.remove("active");
    document.getElementById("listings-map").style.display = "block";
    document.getElementById("listings-grid").style.display = "none";
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

// Open Sign In Modal when "Sign In" button is clicked
document.getElementById("sign-in-button").addEventListener("click", () => {
    const signInModal = new bootstrap.Modal(document.getElementById("signInModal"));
    signInModal.show();
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

    removeErrorOnInput(nameInput);
    removeErrorOnInput(emailInput);
    removeErrorOnInput(passwordInput);
    removeErrorOnRadio(radioInputs);

    removeErrorOnInput(addressLine1Input);
    removeErrorOnInput(cityInput);
    removeErrorOnInput(stateInput);
    removeErrorOnInput(zipCodeInput);
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

    let isValid = true;

    // Validation
    if (!nameInput.value.trim()) {
        nameInput.classList.add("is-invalid");
        isValid = false;
    } else {
        nameInput.classList.remove("is-invalid");
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
    const userProfile = {
        name,
        address,
        sponsor,
        approximate_location: "placeholder_location",
        geo_hash: null,
        dependents: [],
        hoster: null,
    };

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        const userCollection = collection(firestoreDB, "users");
        await addDoc(userCollection, { uid: userCredential.user.uid, ...userProfile });

        alert("Account created successfully!");
        const modal = bootstrap.Modal.getInstance(document.getElementById("signUpModal"));
        modal.hide();
    } catch (error) {
        console.error("Error creating account:", error);
        alert("Failed to create account. Please try again.");
    }

});