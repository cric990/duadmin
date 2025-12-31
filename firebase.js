const firebaseConfig = {
  apiKey: "AIzaSyA2iHrUt8_xxvB2m8-LftaE9sg_5JaiFk8",
  authDomain: "banty-live.firebaseapp.com",
  projectId: "banty-live",
  storageBucket: "banty-live.firebasestorage.app",
  messagingSenderId: "435477036444",
  appId: "1:435477036444:web:207931e07ea52ca3269c59",
  measurementId: "G-HXMVFK1E1C"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

db.enablePersistence({ synchronizeTabs: true })
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
      } else if (err.code == 'unimplemented') {
          console.warn("The current browser does not support all of the features required to enable persistence");
      }
  });

const collections = {
    users: 'XamIQ_Users',
    courses: 'XamIQ_Courses',
    chats: 'XamIQ_Chats',
    notifications: 'XamIQ_Notifications',
    appSettings: 'XamIQ_Settings',
    posters: 'XamIQ_Posters'
};

const getTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();

const fsQuery = (coll) => db.collection(coll);

const storageRef = (path) => storage.ref(path);

const batch = () => db.batch();

const increments = (val) => firebase.firestore.FieldValue.increment(val);

const arrayUnion = (val) => firebase.firestore.FieldValue.arrayUnion(val);

const arrayRemove = (val) => firebase.firestore.FieldValue.arrayRemove(val);

const analytics = firebase.analytics ? firebase.analytics() : null;