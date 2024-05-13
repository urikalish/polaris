const PORT = 1948;

//const axios = require('axios');
const cors = require('cors');
const express = require('express');
const app = express();
app.use(cors());

app.get('/pull-requests', async (req, res) => {
    try {
        //const response = await axios.get('https://api.example.com/data');
        //res.send(response.data);
        console.log('pull-requests');
        res.send({ type: 'pull-requests', data: { username: 'uri-kalish' } });
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

// Start the server

app.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}`));
