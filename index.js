const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken')
const cors = require('cors');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pyxws.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function varifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' })
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  })
}
async function run() {
  try {
    await client.connect();
    const partsCollection = client.db('laptop_parts').collection('parts');
    const bookingCollection = client.db('laptop_parts').collection('bookings');
    const userCollection = client.db('laptop_parts').collection('users');

    app.get('/parts', async (req, res) => {
      const query = {};
      const cursor = partsCollection.find(query);
      const parts = await cursor.toArray();
      res.send(parts);
    })
    app.get('parts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const part = await partsCollection.findOne(query);
      res.send(part);
    })
    // delete parts
      app.delete('/parts/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) }
        const part = await partsCollection.deleteOne(query);
        res.send(part);
    })
    app.delete('/parts/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) }
        const order = await partsCollection.deleteOne(query);
        res.send(order);
    })

    //post booking
    app.post('/booking', async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    })
    // get booking by email
    app.get('/booking', varifyJWT, async (req, res) => {
      const email = req.query.email;
      const authorization = req.headers.authorization;
      //  console.log('auth header',authorization);
      const decodedEmail = req.decoded.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const bookings = await bookingCollection.find(query).toArray();
        return res.send(bookings);
      } else {
        return res.status(403).send({ message: 'Forbidden access' })
      }

    })
    //get users
    app.get('/user', varifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users)
    })
    //
    app.get('/admin/:email', async(req, res) =>{
      const email = req.params.email;
      const user = await userCollection.findOne({email: email});
      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin})
    })

    // put user
    app.put('/user/admin/:email', varifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const RequesterAccount = await userCollection.findOne(email = requester);
      if (RequesterAccount.role === 'admin') {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: 'admin' }
        }
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }else{
        res.status(403).send({message:'Forbidden access'});
      }

    })
    // put user
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user
      }
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ result, token });
    })
  }
  finally {

  }

}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from Laptop Part Server');
})

app.listen(port, () => {
  console.log(`Laptop Parts listening on port ${port}`)
})