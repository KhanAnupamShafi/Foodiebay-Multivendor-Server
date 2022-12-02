const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const { validateCartItems } = require("use-shopping-cart/utilities");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// STRIPE.......
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
    const usersCollection = client.db("all_users").collection("users");
    const restaurantCollection = client
      .db("restaurants_db")
      .collection("restaurants");
    const mealCollection = client.db("restaurants_db").collection("meals");
    const categoryCollection = client
      .db("restaurants_db")
      .collection("category");
    const productsCollection = client.db("all_products").collection("products");
    const orderCollection = client.db("restaurants_db").collection("orders");
    const paymentCollection = client.db("payment_db").collection("payments");

    app.get("/sample", async (req, res) => {
      const query = {};
      const cursor = sampleCollection.find(query);
      const sampleData = await cursor.toArray();
      res.send(sampleData);
    });

    // Get/Read all prtoducts..
    app.get("/products", async (req, res) => {
      const query = {};
      const cursor = productsCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });
    app.get("/products/:query", async (req, res) => {
      const query = { name: req.params.query };
      const products = await productsCollection.findOne(query);

      res.send(products);
    });

    // Get/Read (single product) for payment....
    app.get("/productForPayment/:paymentId", async (req, res) => {
      const paymentId = req.params.paymentId;
      // console.log(paymentId)
      const query = { _id: ObjectId(paymentId) };
      const product = await productsCollection.findOne(query);
      res.send(product);
    });
    // Put/Create .....(users)
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      console.log("user information", user);
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Get/Read (allUsers)....
    app.get("/allUsers", async (req, res) => {
      const totalUsers = await usersCollection.find().toArray();
      res.send(totalUsers);
    });

    // payment method.....
    app.post("/create-payment-intent", async (req, res) => {
      // const{price}=req.body

      const product = req.body;
      const price = product.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // PATCH for payment (transactionID ) store to (database)..
    app.patch("/payment-transactionId/:id", async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      // const filter={_id:ObjectId(id)}
      // const options = { upsert: true };
      // const updateDoc = {
      //     $set: {
      //         transactionId:payment.transactionId
      //     }
      // };
      const result = await paymentCollection.insertOne(payment);
      res.send(result);
    });

    /* -------------------------------------------------------------------------- */
    /*                                    Restaurant API Section Start                                    */
    /* -------------------------------------------------------------------------- */

    // Create New Restaurants
    app.put("/restaurant/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const application = req.body;
      const options = { upsert: true };
      const updateDoc = {
        $set: application,
      };
      const result = await restaurantCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json({ success: true, restaurant: result });
    });
    // Get Own Restaurants Info
    app.get("/restaurant", async (req, res) => {
      const restaurantId = req.query.restaurantId;
      const query = { email: restaurantId };
      const restaurant = await restaurantCollection.findOne(query);
      res.json(restaurant);
    });
    // Get All Restaurants Info
    app.get("/restaurants", async (req, res) => {
      const query = { applicationStatus: "pending" };
      const totalRestaurants = await restaurantCollection.find(query).toArray();

      res.json(totalRestaurants);
    });
    // Get All approved Restaurants Info
    app.get("/restaurants/vendor", async (req, res) => {
      const query = { applicationStatus: "approved" };
      const totalRestaurants = await restaurantCollection.find(query).toArray();

      res.json(totalRestaurants);
    });

    // Get single partner vendors
    app.get("/restaurants/vendor/:restaurantId", async (req, res) => {
      const query = { restaurant_id: req.params.restaurantId };
      const restaurant = await restaurantCollection.findOne(query);

      res.send(restaurant);
    });

    // Request Re-Apply from vendor / Delete Vendor Status
    app.delete("/restaurant", async (req, res) => {
      const email = req.query.restaurantId;
      console.log(email, "as");
      const vendorAccount = await restaurantCollection.findOne({
        email: email,
      });
      if (vendorAccount?.applicationStatus === "pending") {
        const filter = { email: email };
        const updateDoc = {
          $unset: { applicationStatus: "pending" },
        };
        const result = await restaurantCollection.updateOne(filter, updateDoc);

        res.send(result);
      } else {
        res.status(403).send({ message: "Forbidden 403" });
      }
    });

    /* ------------------------- Restaurant API Section End ------------------------- */

    /* -------------------------------------------------------------------------- */
    /*                             Admin section start                            */
    /* -------------------------------------------------------------------------- */

    // Create .... (ADMIN)
    app.put("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      // const options = { upsert: true };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      // res.send(result)

      res.send(result);
    });

    // for super admin(useAdmin)....
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user?.role === "admin";
      res.send({ admin: isAdmin });
    });

    //for admins (useVendor)
    app.get("/vendor/:email", async (req, res) => {
      const email = req.params.email;
      const user = await restaurantCollection.findOne({ email: email });
      const isAdmin = user?.role === "vendor";
      res.send({ vendorAdmin: isAdmin });
    });

    // Delete (user)
    app.delete("/deleteUsers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // Approve vendor role//admin role entry update
    app.patch("/restaurant/:email", async (req, res) => {
      const email = req.params.email;
      const restaurantId = req.body.restaurantId;
      const userAccount = await restaurantCollection.findOne({
        email: email,
      });
      if (userAccount) {
        const filter = { email: email };
        const updateDoc = {
          $set: {
            role: "vendor",
            applicationStatus: "approved",
            restaurant_id: restaurantId,
          },
        };
        const result = await restaurantCollection.updateOne(filter, updateDoc);

        res.send(result);
      } else {
        res.status(403).send({ message: "Forbidden 403" });
      }
    });
    //Remove vendor role//admin role entry update
    app.delete("/restaurant/vendor/:email", async (req, res) => {
      const email = req.params.email;

      const userAccount = await restaurantCollection.findOne({
        email: email,
      });
      if (userAccount) {
        const filter = { email: email };
        const updateDoc = {
          $unset: { role: "vendor" },
          $set: { applicationStatus: "pending" },
        };
        const result = await restaurantCollection.updateOne(filter, updateDoc);

        res.send(result);
      } else {
        res.status(403).send({ message: "Forbidden 403" });
      }
    });

    /* ---------------------------- Admin section end --------------------------- */

    /* -------------------------------------------------------------------------- */
    /*                      Vendor  Section Start                                */
    /* -------------------------------------------------------------------------- */

    // Vendor add menu items

    app.post("/meal", async (req, res) => {
      const data = req.body;
      const result = await mealCollection.insertOne(data);
      res.send({ success: true, meal: result });
    });

    // Vendor Add Category
    app.post("/category", async (req, res) => {
      const data = req.body;
      const result = await categoryCollection.insertOne(data);
      res.send({ success: true, category: result });
    });

    // Get/Read all Categories..
    app.get("/category", async (req, res) => {
      const query = {};
      const cursor = categoryCollection.find(query);
      const category = await cursor.toArray();
      res.send(category);
    });
    // Get/Read all Food Items..
    app.get("/meal", async (req, res) => {
      const query = {};
      const cursor = mealCollection.find(query);
      const meal = await cursor.toArray();
      res.send(meal);
    });
    // Get/Read all Food Items..
    app.get("/meal/:meal_id", async (req, res) => {
      const query = { _id: ObjectId(req.params.meal_id) };
      const meal = await mealCollection.findOne(query);

      res.send(meal);
    });

    /* --------------------------- Vendor Section End --------------------------- */

    /* -------------------------------------------------------------------------- */
    /*                             Restaurant Section                             */
    /* -------------------------------------------------------------------------- */

    //get unique restaurant menu
    app.get("/menu/:restaurant_id", async (req, res) => {
      const id = req.params.restaurant_id;
      const query = {
        // restaurantInfo: { restaurant_id: "149q8u2YvG5js7vSqJQzI" },
        "restaurantInfo.restaurant_id": id,
      };
      const cursor = mealCollection.find(query);
      const restaurantMenu = await mealCollection.distinct(
        "category.label",
        query
      );
      const menuItems = await cursor.toArray();

      res.send({ items: menuItems, menu: restaurantMenu });
    });

    //handle stripe checkout use shopping cart
    app.post("/checkout-sessions", async (req, res) => {
      try {
        const cartItems = req.body;
        const cursor = mealCollection.find({});
        const meal = await cursor.toArray();
        // console.log(meal);
        const line_items = validateCartItems(meal, cartItems);

        const origin =
          process.env.NODE_ENV === "production"
            ? req.headers.origin
            : "http://localhost:3000";
        // console.log(origin);
        const params = {
          submit_type: "pay",
          payment_method_types: ["card"],
          billing_address_collection: "auto",
          shipping_address_collection: {
            allowed_countries: ["US", "CA", "BD"],
          },
          line_items,
          // success_url: "http://localhost:3000/?success=true",
          // cancel_url: "http://localhost:3000/?canceled=true",
          success_url: `${origin}/result?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: origin,
          mode: "payment",
        };
        const checkoutSession = await stripe.checkout.sessions.create(params);
        res.status(200).json({ checkoutSession, cart: line_items });
      } catch (error) {
        res.status(500).json({ statusCode: 500, message: error.message });
      }
    });
    //get checkout data
    app.get("/checkout-sessions/:sessionId", async (req, res) => {
      const { sessionId } = req.params;
      try {
        if (!sessionId.startsWith("cs_")) {
          throw Error("Incorrect session ID");
        }
        const checkout_session = await stripe.checkout.sessions.retrieve(
          sessionId,
          {
            expand: ["payment_intent"],
          }
        );
        res.status(200).json(checkout_session);
      } catch (error) {
        res.status(500).json({ statusCode: 500, message: error.message });
      }
    });
    // Post successfull orders to db Note:: setOnInsert to avoid upsert cart items
    app.put("/order", async (req, res) => {
      const order = req.body;
      const filter = { order_id: order.order_id };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          user: order.user,
          email: order.email,
          orderDate: order.orderDate,
          amount_subtotal: order.amount_subtotal,
          amount_total: order.amount_total,
          created: order.created,
          expires_at: order.expires_at,
          customer_details: order.customer_details,
          order_id: order.order_id,
          payment_intent: order.payment_intent,
          payment_status: order.payment_status,
          restaurant_id: order.restaurant_id,
        },
        $setOnInsert: {
          cartItems: order.cartItems,
          totalPrice: order.totalPrice,
        },
      };

      const result = await orderCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json({ success: true, order: result });
    });

    //get user specific orders
    app.get("/order", async (req, res) => {
      const customer = req.query.email;

      const query = { email: customer };
      const orders = await orderCollection.find(query).toArray();
      res.send(orders);
    });

    //get restaurant specific orders
    app.get("/order/:restaurantId", async (req, res) => {
      const restaurant = req.params.restaurantId;

      const query = { restaurant_id: restaurant };
      const orders = await orderCollection.find(query).toArray();
      res.send(orders);
    });

    //update order

    app.patch("/deliver/:id", async (req, res) => {
      const order = req.params.id;

      const filter = { order_id: order };
      const updateDoc = {
        $set: {
          delivered: true,
        },
      };
      const result = await orderCollection.updateOne(filter, updateDoc);

      res.send(result);
    });
    /* ------------------------- Restaurant Section ends ------------------------ */
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to Foodiebay Server");
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
