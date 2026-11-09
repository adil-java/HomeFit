import prisma from '../config/db.js';
import logger from '../utils/logger.js';

const TYPES = ['home', 'work', 'other'];
const clean = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Validate and normalise an address from the request body.
// Returns { data } or { error } with a message the user can read.
function parseAddress(body = {}) {
  const data = {
    type: TYPES.includes(clean(body.type).toLowerCase()) ? clean(body.type).toLowerCase() : 'home',
    street: clean(body.street, 300),
    city: clean(body.city, 100),
    state: clean(body.state, 100) || null,
    postalCode: clean(body.postalCode, 20),
    country: clean(body.country, 100) || 'Pakistan',
    phone: clean(body.phone, 30),
  };

  if (!data.street) return { error: 'Please enter your street address' };
  if (!data.city) return { error: 'Please enter your city' };
  if (!data.postalCode) return { error: 'Please enter your postal code' };
  if (!data.phone || data.phone.replace(/[^\d]/g, '').length < 7) {
    return { error: 'Please enter a valid phone number' };
  }
  return { data };
}

const list = (userId) =>
  prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

// GET /api/addresses
export const getAddresses = async (req, res) => {
  try {
    res.json({ success: true, data: await list(req.user.id) });
  } catch (error) {
    logger.error('Get addresses error:', error);
    res.status(500).json({ success: false, error: 'Could not load your addresses' });
  }
};

// POST /api/addresses
export const createAddress = async (req, res) => {
  const { data, error } = parseAddress(req.body);
  if (error) return res.status(400).json({ success: false, error });

  try {
    const count = await prisma.address.count({ where: { userId: req.user.id } });
    if (count >= 20) {
      return res.status(400).json({ success: false, error: 'You can save up to 20 addresses' });
    }
    // First address, or explicitly requested → becomes the default
    const makeDefault = count === 0 || req.body.isDefault === true;

    await prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
      }
      await tx.address.create({ data: { ...data, userId: req.user.id, isDefault: makeDefault } });
    });

    res.status(201).json({ success: true, data: await list(req.user.id) });
  } catch (err) {
    logger.error('Create address error:', err);
    res.status(500).json({ success: false, error: 'Could not save the address' });
  }
};

// PUT /api/addresses/:id
export const updateAddress = async (req, res) => {
  const { data, error } = parseAddress(req.body);
  if (error) return res.status(400).json({ success: false, error });

  try {
    const { count } = await prisma.address.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data,
    });
    if (count === 0) return res.status(404).json({ success: false, error: 'Address not found' });
    res.json({ success: true, data: await list(req.user.id) });
  } catch (err) {
    logger.error('Update address error:', err);
    res.status(500).json({ success: false, error: 'Could not update the address' });
  }
};

// PATCH /api/addresses/:id/default
export const setDefaultAddress = async (req, res) => {
  try {
    const found = await prisma.address.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      select: { id: true },
    });
    if (!found) return res.status(404).json({ success: false, error: 'Address not found' });

    await prisma.$transaction([
      prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } }),
      prisma.address.update({ where: { id: found.id }, data: { isDefault: true } }),
    ]);
    res.json({ success: true, data: await list(req.user.id) });
  } catch (err) {
    logger.error('Set default address error:', err);
    res.status(500).json({ success: false, error: 'Could not update the default address' });
  }
};

// DELETE /api/addresses/:id
export const deleteAddress = async (req, res) => {
  try {
    const found = await prisma.address.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      select: { id: true, isDefault: true },
    });
    if (!found) return res.status(404).json({ success: false, error: 'Address not found' });

    await prisma.address.delete({ where: { id: found.id } });

    // Keep one default: promote the most recent remaining address
    if (found.isDefault) {
      const next = await prisma.address.findFirst({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }

    res.json({ success: true, data: await list(req.user.id) });
  } catch (err) {
    logger.error('Delete address error:', err);
    res.status(500).json({ success: false, error: 'Could not delete the address' });
  }
};
