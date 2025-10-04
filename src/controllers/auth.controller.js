const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, doctorService, tokenService } = require('../services');
const pino = require('pino');

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname'
    }
  }
});

const register = catchAsync(async (req, res) => {
  logger.info('Registering new doctor:', req.body.email);
  const doctor = await doctorService.createDoctor(req.body);
  const tokens = await tokenService.generateAuthTokens(doctor);
  res.status(httpStatus.CREATED).send({ doctor, tokens });
});

const login = catchAsync(async (req, res) => {
  logger.info('Attempting login for:', req.body.email);
  const { email, password } = req.body;
  const doctor = await authService.loginDoctorWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(doctor);
  res.send({ doctor, tokens });
});

module.exports = {
  register,
  login,
};
