// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from "firebase/firestore";
import { getFirestore, addDoc, query, limit, getDocs, collection, orderBy, startAt, endAt, where, GeoPoint } from "firebase/firestore";
import { geohashQueryBounds, distanceBetween } from 'geofire-common';

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

let userLocation = null;
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (position) => {
        userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };
        console.log("User location:", userLocation);
        const listings = await getDocumentsInRadius(userLocation.lat, userLocation.lng, 25); // 50 km radius
        console.log("Listings:", listings);
    }, (error) => {
        console.error("Error getting location:", error);
    });
}

// TODO: types of listings (looking-for, offering)