## Overview
This directory contains code for the browser-based UI.  These files are separated for organizational purposes, to avoid `main.js` being >5k lines long.  Despite being imported, nothing in this directory is a true self-contained "module," and everything is assumed to run in the same scope as `main.js`.  No application logic aside from the UI should occur in these files, as they are unable to be run in Node.js in the command line version. 