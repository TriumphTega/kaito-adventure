# Kaito Adventure (React Native Expo Version)

This project is a mobile-optimized port of the original Kaito Adventure web app, now built with **React Native** using **Expo**. It features navigation between key screens and a UI adapted for mobile usability, while preserving the spirit and style of the original game.

## Tech Stack
- React Native (with Expo)
- @react-navigation/native (for navigation)
- @react-native-async-storage/async-storage (for persistence)
- react-native-paper (for UI components)

## Main Screens
- Home (main gameplay)
- Inventory
- Quests
- Stats

## How to Run
1. Install [Expo CLI](https://docs.expo.dev/get-started/installation/):
   ```sh
   npm install -g expo-cli
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the Expo app:
   ```sh
   expo start
   ```
4. Scan the QR code with the Expo Go app on your phone, or run on an emulator.

## Notes
- The UI has been tweaked for mobile usability, but retains the original theme and feel.
- All game logic and state are preserved from the web version.
- For any issues, please open an issue or PR.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
