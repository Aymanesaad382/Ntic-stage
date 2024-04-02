const express = require('express')
const mysql = require('mysql') 
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const path = require('path')
const multer = require('multer')
const cookieParser = require('cookie-parser')

const app= express()

app.use(express.static(path.join(__dirname, "public")))
app.use(express.json())
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["POST", "GET"],
    credentials: true
}));
app.use(cookieParser())
app.use(express.static('public'))

const port = 5000

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "stage"
})

const storage = multer.diskStorage({
    destination: (req , file , cb) =>{
        cb(null, 'public/files')
    },
    filename : (req , file , cb) =>{
        cb(null, file.fieldname + '-' + Date.now()+path.extname(file.originalname));
    }
})

const upload= multer({
    storage: storage
})


               //Gestion des document ///// formateur//////
//add document
app.post('/add', upload.single('corr_doc'), (req, res) => {
    const { titre, type, niveau, module, matricule } = req.body;
    const corr_doc = req.file.filename;

    const sql = "INSERT INTO document (`titre`, `type`, `niveau`, `module`, `matricule`, `corr_doc`) VALUES (?, ?, ?, ?, ?, ?)";
    const values = [titre, type, niveau, module, matricule, corr_doc];

    db.query(sql, values, (err, result) => {
        if (err) {
            return res.json({ message: 'Something unexpected has occurred' + err });
        } else {
            return res.json({ success: 'Document added successfully' });
        }
    });
});

//afficher les documents
app.get('/documents', (req,res)=>{
    const sql = "SELECT * FROM document ";
    db.query(sql, (err, result)=>{
        if(err) res.json({"message":"server error"})
        return res.json(result);
})
})

//aficher un document  par id
app.get('/get_documents/:id', (req,res)=>{
    const id = req.params.id;
    const sql = "SELECT * FROM document WHERE `id_doc` = ?";
    db.query(sql, [id], (err, result)=>{
       if (err) res.json({ message : "server error"});
       return res.json(result);
    });
});

//update document par id
app.put('/update/:id', (req, res) => {
    const id = req.params.id;
    const sql = "UPDATE document SET `titre` = ?, `type` = ?, `niveau` = ?, `module` = ?, `matricule` = ?, `corr_doc` = ? WHERE `id_doc` = ?";
    const values = [
        req.body.titre,
        req.body.type,
        req.body.niveau,
        req.body.module,
        req.body.matricule,
        req.body.corr_doc,
        id
    ];
    db.query(sql, values, (err, result) => {
        if (err) {
            return res.json({ message: 'Something unexpected has occurred' + err });
        } else {
            return res.json({ success: 'Document updated successfully' });
        }
    });
});

app.delete('/delete/:id', (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM  document  WHERE `id_doc` = ?";
    const values = [id];
    db.query(sql, values, (err, result) => {
        if (err) {
            return res.json({ message: 'Something unexpected has occurred' + err });
        } else {
            return res.json({ success: 'Document Deleted successfully' });
        }
    });
});


         //login for formateur ///////////////////////////

//login formateur
app.post("/login", (req, res)=>{
    const sql = "SELECT * FROM formateur WHERE matricule = ? AND pass =? " ;
    const values = [
        req.body.matricule,
        req.body.password
    ]
    db.query(sql,values, (err ,data)=>{
        if(err) return res.json("Login Failed");
        if (data.length > 0){
            const nom = data[0].nom;
            const prenom = data[0].prenom;
            const token = jwt.sign({nom , prenom}, "jwt-secret-key" , {expiresIn : '1d'});
            res.cookie('token',token);
            return res.json(data)
        }
        else{
            return res.json({status:"cordonnee incorrect"});
        }
        
    })
})

//verifie login formateur
const verifyUser = (req,res,next)=>{
    const token = req.cookies.token;
    if (token){
        jwt.verify(token , "jwt-secret-key" , (err,decoded)=>{
            if(err){
                return res.json({Error : "Token is not okay"});
            }
            else{
                req.prenom=decoded.prenom;
                req.nom = decoded.nom;
                next();
            }
        })
    }else{
        return res.json({Error: "You are not authenticated"});
    }
}

app.get('/dashbord', verifyUser , (req,res)=>{
    return res.json({status: "success", nom: req.nom, prenom : req.prenom});
})


//logout delete token

app.get('/logout' , (req,res)=>{
    res.clearCookie('token');
    returnres.json({status : "success"});
})





//login stagiaire 

app.post("/loginstagiaire", (req, res)=>{
    const sql = "SELECT * FROM stagiaire WHERE CEF = ? AND pass =? " ;
    const values = [
        req.body.cef,
        req.body.password
    ]
    db.query(sql,values, (err ,data)=>{
        if(err) return res.json("Login Failed");
        if (data.length > 0){
            const CEF =  data[0].CEF;
            const nom = data[0].nom;
            const prenom = data[0].prenom;
            const role = "stagiaire";
            const loginS = jwt.sign({nom , prenom , CEF , role}, "jwt-secret-key" , {expiresIn : '1d'});
            res.cookie('loginS',loginS);
            return res.json(data)
        }
        else{
            return res.json({status:"cordonnee incorrect"});
        }
        
    })
})

//verifie login stagiaire
const verifyStagiaire = (req,res,next)=>{
    const loginS = req.cookies.loginS;
    if (loginS){
        jwt.verify(loginS , "jwt-secret-key" , (err,decoded)=>{
            if(err){
                return res.json({Error : "Token is not okay"});
            }
            else{
                req.CEF = decoded.CEF;
                req.role=decoded.role;
                req.prenom=decoded.prenom;
                req.nom = decoded.nom;
                next();
            }
        })
    }else{
        return res.json({Error: "You are not authenticated"});
    }
}

app.get('/homestagiaire', verifyStagiaire , (req,res)=>{
    return res.json({status: "success",  nom: req.nom, prenom : req.prenom , CEF: req.CEF , role: req.role});
})

//logout delete token

app.get('/logoutStagiaire' , (req,res)=>{
    res.clearCookie('loginS');
    returnres.json({status : "success"});
})



//select stagiaire info  by CEF
app.get('/profil', (req, res) => {
    const CEF = req.query.CEF; // Accessing query parameters
    const sql = "SELECT * FROM stagiaire WHERE `CEF` = ?";
    db.query(sql, [CEF], (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
        return;
      }
      if (result.length === 0) {
        res.status(404).send("No data found");
        return;
      }
      res.send(result[0]);
    });
  });


//Download file pdf
app.get('/download', (req, res) => {
    const filename = req.query.fileName; // Use query instead of body for GET requests
    res.download(`./public/files/${filename}`);
});
//Ajout Message 
app.post('/message', (req, res) => {
    const { nom, prenom, email, message } = req.body;
    const sql = "INSERT INTO message (`nom`, `prenom`, `email`, `message`) VALUES (?, ?, ?, ?)";
    const values = [nom, prenom, email, message ];

    db.query(sql, values, (err, result) => {
        if (err) {
            return res.json({ message: 'Something unexpected has occurred' + err });
        } else {
            return res.json({ success: 'Document added successfully' });
        }
    });
});


// stagiaire home search by title 





























app.listen(port , ()=>{
    console.log(`Server is running on ${port}`);
})




































/* app.post('/add',(req,res)=>{
    sql = "INSERT INTO document (`titre`,`type`,`niveau`,`module`,`matricule`,`corr_doc`) VALUES (?,?,?,?,?,?)";
    const values = [
        req.body.titre,
        req.body.type,
        req.body.niveau,
        req.body.module,
        req.body.matricule,
        req.body.corr_doc
    ]
    db.query(sql,values, (err , result) => {
        if(err) return res.json({message: 'Something unexpected has occured'+err })
        return res.json({success: 'Document added successfully'})   
    });
})  */



/* app.get('/get_documents/:id', (req,res)=>{
    const id = req.params.id;
    const sql = "SELECT * FROM document where `id` = ? ";
    db.query(sql,[id], (err, result)=>{
        if(err) res.json({"message":"server error"})
        return res.json(result);
})
})
*/