# NewMotionAPI

## Setup
1. Clone this project.
2. Fill in your email & password of The New Motion in the prefilled .env file in the root directory.
3. Run the NodeJS app.
4. Your app will run on port `:3000`

## API Description
The NewMotionAPI exposes a couple of endpoints:
* Getting the configured car(s):<br>
`/cars/getCars`
* Getting the configured charge card(s):<br>
`/cards/getChargeCards`
* Getting the configured home charge point(s):<br>
`/charging/getChargepoints`
* Getting the total usage since installation date of the home charger:<br>
`/charging/getTotalUsage`
* Getting the last charge sessions of the past month since "today":<br>
`/charging/getLastChargeSessions`
* Get user info:<br>
`/users/getUser`
