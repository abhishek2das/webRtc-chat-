import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js';
import { getFirestore} from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js';
import { getAuth, signInWithPopup, GoogleAuthProvider,signOut  } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js';
import {getDatabase,set,ref,push,child,onValue,onChildAdded} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBbpvzfNTXm3M8vAqK-0HLE6plSgF4vBD0",
  authDomain: "auth2-b72b0.firebaseapp.com",
  projectId: "auth2-b72b0",
  storageBucket: "auth2-b72b0.appspot.com",
  messagingSenderId: "171826316097",
  appId: "1:171826316097:web:950b331c4437e9f29397c0",
  measurementId: "G-865GVLDEZC"
  };
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const database = getDatabase(app);
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/contacts.readonly');

  var Uid = "message";
   var login = false
   var userUid = "";
   var profPic = "";
   var userName ="";

  // var mainData = "";
  // var mainProfile = document.querySelector(".astroImg");
  // var mainProName = document.querySelector(".pHeadingName");



  $(".GoogleLogIn").click(()=>{loginOp()});  

  function afterLogIn(){
    $(".full-chat-body").show();
    $(".LogTheChat").hide();
    login = true
    $(".signOut").show()
    $(".GoogleLogIn").hide()

  }

function loginOp(){
  signInWithPopup(auth, provider).then((result) => {
    const user = result.user;
    userUid = user.uid
    profPic = user.photoURL
    userName = user.displayName
    afterLogIn()
  }).catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    const email = error.customData.email;
    const credential = GoogleAuthProvider.credentialFromError(error);
    console.log(error)
  });
}
 
$(".signOut").click(()=>{
  signOut(auth).then(() => {
    $(".full-chat-body").hide();
    $(".LogTheChat").show();
    $(".signOut").hide()
    $(".GoogleLogIn").show()
    var login = false
    var userUid = "";
    var profPic = "";
    var userName ="";
  }).catch((error) => {});
})

$(".SendBtn").click(()=>{
  
  if(login == true){
    var message = document.querySelector(".inputBox").value;
    if(message !== ""){
      Uid = "message";
      const id = push(child(ref(database),Uid)).key;
    
      set(ref(database, `${Uid}/` + id), {
          uid: userUid,
          message: message,
          UName:userName,
          uPhoto:profPic
      });
      document.querySelector(".inputBox").value = ""
    }else{
      alert("message box is empty")
    }

  }else{
    alert("Please login in first")
  }
})


  var d1 = document.querySelector('.chat-body');
  const newMsg = ref(database, `${Uid}/`);

  onChildAdded(newMsg, (data) => {
   if(login == true){
     if(data.val().uid == userUid){
       const newMessage =`<div class="messageCont2">
       <div class="message-box2">
         <p>${data.val().message}</p>
       </div>
     </div>`
   
     d1.insertAdjacentHTML("beforeend", newMessage);
     change()
     }else{
       const newMessage =`<div class="messageCont">
       <img src="${data.val().uPhoto}" class="messageImg">
       <div class="message-box">
         <h6>${data.val().UName}</h6>
         <p>${data.val().message}</p>
       </div>
     </div>`
     d1.insertAdjacentHTML("beforeend", newMessage);
     change()
     }
   }
  
  });

function change(){
  const el = document.querySelector('.chat-body');
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
}

var input = document.querySelector(".inputBox");
input.addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    $(".SendBtn").click()
  }
});



