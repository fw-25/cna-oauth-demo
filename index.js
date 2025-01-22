const express = require('express')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const port = process.env.PORT || 3000
const app = express()

app.get("/", (req, res) => {
    if (!req.query.token) {
        return res.send(`
            <h1>Hello!</h1>
            <a href="./auth">Logga in med GitHub</a>
            `)
    } else {
        try {
            const user = jwt.verify(req.query.token, process.env.JWT_SECRET);

            return res.send(`
                <h1>Hello ${user.name}!</h1>
                You are logged in!
            `);

        } catch (error) {
            console.log(error);
            res.status(401).send('Authorization failed!')
        }
    }

});

app.get("/auth", (req, res) => {

    /** params:
     * scope=read:user
     * client_id=process.env.CLIENT_ID
     */
    res.redirect(`https://github.com/login/oauth/authorize?scope=read:user&client_id=${process.env.CLIENT_ID}`)

})

app.get("/github-callback", async (req, res) => {
    
    const body = {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code: req.query.code // skickas tillbaka av github
    }

    try {
        const response = await fetch ("https://github.com/login/oauth/access_token", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        })

        const gho_data = await response.json();
        console.log(gho_data)

        /** 
         * Nästa steg: 
         *  - hämta user data
         *  - skapa egen JWT (eller motsvarande session)
         *  - redirecta till vår huvudsida
         * */ 

        const responseUser = await fetch("https://api.github.com/user", {
            headers: { 'Authorization': `Bearer ${gho_data.access_token}`}
        });

        const userData = await responseUser.json();

        console.log(userData);

        const site_token = jwt.sign({
            id: userData.id,
            name: userData.name
        }, process.env.JWT_SECRET, {expiresIn: '1h'});

        res.redirect(`/?token=${site_token}`);

    } catch (err) {
        console.log(err),
        res.status(500).send("ERROR: Something went wrong");
    }

});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
});