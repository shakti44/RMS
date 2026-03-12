const Joi = require('joi');

const orderItemSchema = Joi.object({
  menuItemId:        Joi.string().uuid().required(),
  quantity:          Joi.number().integer().min(1).max(50).required(),
  modifierOptionIds: Joi.array().items(Joi.string().uuid()).default([]),
  specialNote:       Joi.string().max(200).optional().allow('', null),
});

const placeOrderSchema = Joi.object({
  restaurantId:    Joi.string().uuid().required(),
  tableId:         Joi.string().uuid().optional().allow(null),
  orderType:       Joi.string().valid('dine_in', 'takeaway', 'delivery').default('dine_in'),
  items:           Joi.array().items(orderItemSchema).min(1).required(),
  customerName:    Joi.string().max(100).optional().allow('', null),
  customerPhone:   Joi.string().max(20).optional().allow('', null),
  deliveryAddress: Joi.object({
    line1:  Joi.string().required(),
    city:   Joi.string().required(),
    state:  Joi.string().optional(),
    pincode:Joi.string().optional(),
  }).optional().allow(null),
  specialNotes:    Joi.string().max(500).optional().allow('', null),
});

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('confirmed','preparing','ready','served','completed','cancelled')
    .required(),
});

module.exports = { placeOrderSchema, updateStatusSchema };
