const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Configure CORS (allow requests from your frontend)
app.use(cors({
    origin: 'http://localhost', // Replace with your frontend URL
    methods: ['GET', 'POST'],
    credentials: true,
}));

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Step 1: Redirect user to Spotify login
app.get('/login/spotify', (req, res) => {
    const scope = 'user-library-read';
    const url = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=${scope}`;
    res.redirect(url);
});

// Step 2: Handle Spotify callback and fetch liked songs
app.get('/callback', async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.status(400).json({ error: 'Authorization code is missing' });
    }

    try {
        // Exchange code for access token
        const spotifyTokenResponse = await axios.post('https://accounts.spotify.com/api/token', null, {
            params: {
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
                client_id: SPOTIFY_CLIENT_ID,
                client_secret: SPOTIFY_CLIENT_SECRET,
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const accessToken = spotifyTokenResponse.data.access_token;
        console.log('Access Token:', accessToken);

        // Fetch all liked songs using pagination
        let allLikedSongs = [];
        let nextUrl = 'https://api.spotify.com/v1/me/tracks?limit=50'; // Fetch 50 songs per request

        while (nextUrl) {
            console.log('Fetching songs from:', nextUrl);
            const likedSongsResponse = await axios.get(nextUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            // Add the current page of songs to the list
            allLikedSongs = allLikedSongs.concat(likedSongsResponse.data.items);

            // Check if there's another page
            nextUrl = likedSongsResponse.data.next;
        }

        console.log('Total songs fetched:', allLikedSongs.length);

        // Send all liked songs back to the frontend
        res.json(allLikedSongs);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'An error occurred while fetching liked songs' });
    }
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});