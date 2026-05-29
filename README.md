# Cart One Shopping Cart

React + Node.js shopping cart built for the Orbit / Cart One take-home assignment.

## Backend

```bash
cd backend
npm install
npm run dev
```

The API runs on `http://localhost:4000` by default.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on the Vite URL printed in the terminal, usually `http://127.0.0.1:5173`.

## Environment Variables

Backend:

```bash
PORT=4000
```

Frontend:

```bash
VITE_API_URL=http://localhost:4000
```

## What Is Done

- Product listing loads from `GET /products`.
- Register and login endpoints are implemented in the Node API.
- Cart supports add, update quantity, remove, and empty states.
- Frontend calls the real API for all product and cart data.
- Quantity controls prevent adding more than available stock.
- Billing screen shows an order summary and clears the cart after placing an order.
- Loading and error states are visible in the UI.

## Known Limitations

- Data is stored in memory, so users and carts reset when the backend restarts.
- Passwords are plain text for assignment simplicity; production should hash passwords.
- Authentication uses simple bearer tokens stored in memory.
- With more time, I would add SQLite persistence, automated tests, and route-level validation middleware.
