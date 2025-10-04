const express = require('express');
const authRoutes = require('./auth.routes');
const doctorRoutes = require('./doctor.routes');
const patientRoutes = require('./patient.routes');
const appointmentRoutes = require('./appointment.routes');
const webhookRoutes = require('./webhook.routes');
const contextRoutes = require('./context.routes');

const router = express.Router();

const defaultRoutes = [
  { path: '/auth', route: authRoutes },
  { path: '/doctors', route: doctorRoutes },
  { path: '/patients', route: patientRoutes },
  { path: '/appointments', route: appointmentRoutes },
  { path: '/webhooks', route: webhookRoutes },
  { path: '/context', route: contextRoutes }];

// TODO: Implement route registration logic if needed, otherwise this loop is sufficient.

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;