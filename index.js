const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const cookieParser = require('cookie-parser');
require('dotenv').config()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



app.use(cors());
app.use(express.json());

app.use(cookieParser());
app.use(cors({
  origin: [
    'https://foodblogs.surge.sh',
    

  ],
  credentials: true
}))


const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' });
  }

  // verify the token
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' });
    }
    req.user = decoded;
    next();
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fnpaz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// blogs related apis
const blogsCollection = client.db('BlogApplications').collection('blogs');
const commentsCollection = client.db('BlogApplications').collection('comments');
const wishlistCollection = client.db('BlogApplications').collection('wishlist');
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


    // Featured Blogs API
    app.get('/featured-blogs', async (req, res) => { // New line
      try {
        const blogs = await blogsCollection.aggregate([
          {
            $addFields: { // Adding word count to blogs
              wordCount: { $size: { $split: ["$longDescription", " "] } } // New line
            }
          },
          { $sort: { wordCount: -1 } }, // Sorting by word count descending
          { $limit: 10 } // Limiting to top 10 blogs
        ]).toArray();

        res.send(blogs); // Sending the sorted blogs as response
      } catch (error) {
        console.error('Error fetching featured blogs:', error);
        res.status(500).send({ error: 'Failed to fetch featured blogs' }); // New line
      }
    });



    app.post('/wishlist', async (req, res) => {
      const widhInfo = req.body;
      const result = await wishlistCollection.insertOne(widhInfo);
      res.send(result)
    })

    app.get('/wishlist', async (req, res) => {
      const cursor = wishlistCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    });


    app.get('/wishlist/:email', async (req, res) => {
      const email = req.params.email;
      const query = {userEmail: email };
      const result = await wishlistCollection.find(query).toArray();
      res.send(result)
    })


    
    app.delete('/wishlist/:id', async (req,res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)};
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });

    // for all blogs
    // 
    app.get('/blogs', async (req, res) => {
      const category = req.query.category || ''; // category
      // const search = req.query.search || ''; // search korar konno

      const query = {};

      // if (search) {
      //   query.$text = { $search: search }; // MongoDB text search
      // }

      if (category) {
        query.category = category; // category
      }

      try {
        const blogs = await blogsCollection.find(query).toArray();
        res.send(blogs);
      } catch (err) {
        console.error('Error fetching blogs:', err);
        res.status(500).send({ error: 'Failed to fetch blogs' });
      }
    });





    app.post('/blogs', async (req, res) => {
      const newBlog = req.body;
      console.log(newBlog);
      const result = await blogsCollection.insertOne(newBlog);
      res.send(result);
    })


    app.post('/jwt', (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10h' });

      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
        })
        .send({ success: true })

    });





    // new
    app.get('/blogs/:id', async (req, res) => {
      const id = req.params.id;
    
      // ObjectId is valid check
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: 'Invalid Blog ID format' });
      }
    
      try {
        const blog = await blogsCollection.findOne({ _id: new ObjectId(id) });
        if (!blog) {
          return res.status(404).send({ error: 'Blog not found' });
        }
        res.send(blog);
      } catch (err) {
        console.error('Error fetching blog details:', err);
        res.status(500).send({ error: 'Failed to fetch blog details' });
      }
    });
    
 

    // comment related apis


    app.get('/comments', async (req, res) => {
      const blogId = req.query.blogId; // blog take front end newa
      const query = { blogId: blogId };
      const result = await commentsCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/comments', async (req, res) => {
      const newComment = req.body;
      const result = await commentsCollection.insertOne(newComment);
      res.send(result);
    });






    // step 2  korear
    app.put('/blogs/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const blogupdated = req.body;
      const updated = {
        $set: {
          title: blogupdated.title,
          image: blogupdated.image,
          category: blogupdated.category,
          shortDescription: blogupdated.shortDescription,
          longDescription: blogupdated.longDescription,
        }
      }
      const result = await blogsCollection.updateOne(filter, updated, options)
      res.send(result);
    })






    app.get('/blogs', async (req, res) => {
      const cursor = blogsCollection.find().limit(6);
      const result = await cursor.toArray();
      res.send(result);


      app.get('/blogs/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await blogsCollection.findOne(query);
        res.send(result);
      })
    })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('blog is flying into the air in the sky')
})

app.listen(port, () => {
  console.log(`blog is waiting at :${port}`)
})


