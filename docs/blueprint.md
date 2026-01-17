# **App Name**: ChronoSelect

## Core Features:

- Touch Detection: Detect and track up to 10 independent touch points on the screen to capture selections.
- Time-Travel Visual Effect: Generate a dark "Black Hole" core and many tiny orbiting light spots (particles) with motion blur around each touch point, creating a dynamic "Time Travel" aesthetic that pulses subtly.
- Countdown Process: Implement a 3-second countdown that accelerates the speed of the orbiting light spots.
- Winner Announcement: Visually announce the winning finger by collapsing all light spots from all inputs into the winning finger into a bright flash ("Big Bang") while the others spin out of control and fade away.
- Audio Feedback: Provide auditory feedback with accelerating "Tick-Tick" sounds during the countdown and cinematic "Whoosh" and "Ding" sounds for the winner announcement.
- Inactive Prompt: Display 'Tag your finger' after 10 seconds of inactivity.
- Team Split Mode: Split the fingers into 2 teams.

## Style Guidelines:

- Primary color: White for the finger and light particles.
- Background color: Black provides high contrast.
- Font: 'Space Grotesk', a sans-serif for a techy, modern feel, suitable for headlines and UI elements.
- Use AnimationController for constant rotation of light spots. Implement pulse effect, light spot collapse and fade with subtle, high-performance animations.
- Full-screen layout with a solid black background to emphasize the light effects. Interactive elements are clearly visible and easily accessible.
- Use glowing icons for visual clarity.