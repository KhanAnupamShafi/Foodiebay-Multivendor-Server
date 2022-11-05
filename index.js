const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// STRIPE.......
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@foodiebay-production.ei6y0sl.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    console.log("MongoDB database connected");
    const sampleCollection = client.db("sample_guides").collection("planets");
    const usersCollection = client.db('all_users').collection('users')
    const productsCollection = client.db('all_products').collection('products')
    const paymentCollection =client.db('payment_db').collection('payments')

    app.get("/sample", async (req, res) => {
      const query = {};
      const cursor = sampleCollection.find(query);
      const sampleData = await cursor.toArray();
      res.send(sampleData);
    });

    // Get/Read all prtoducts..
    app.get('/products', async (req, res) => {
      const query = {}
      const cursor = productsCollection.find(query)
      const products = await cursor.toArray()
      res.send(products)
    })

    // Get/Read (single product) for payment....
    app.get('/productForPayment/:paymentId', async (req, res) => {
      const paymentId = req.params.paymentId
      // console.log(paymentId)
      const query = { _id: ObjectId(paymentId) }
      const product = await productsCollection.findOne(query)
      res.send(product)

    })
    // Put/Create .....(users)
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email
      const user = req.body
      console.log('user information', user)
      const filter = { email: email }
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.send(result)
    })


    // Get/Read (allUsers)....
    app.get('/allUsers', async (req, res) => {
      const totalUsers = await usersCollection.find().toArray()
      res.send(totalUsers)
    })


    // payment method.....
    app.post('/create-payment-intent', async (req, res) => {
      // const{price}=req.body

      const product = req.body
      const price = product.price
      const amount = price * 100
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({ clientSecret: paymentIntent.client_secret, })
    })

    // PATCH for payment (transactionID ) store to (database)..
    app.patch('/payment-transactionId/:id',async(req,res)=>{
      const id=req.params.id
      const payment=req.body;
      // const filter={_id:ObjectId(id)}
      // const options = { upsert: true };
      // const updateDoc = {
      //     $set: {
      //         transactionId:payment.transactionId
      //     }
      // };
      const result=await paymentCollection.insertOne(payment);
      res.send(result)
  })


  }

  finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to Foodiebay Server");
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
