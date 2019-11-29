import Customize from '../helpers/Customize';
import { users } from '../database/models';

const isManager = async (req, res, next) => {
  const { managerId } = req.body;
  const manager = await users.findOne({
    where: {
      id: managerId,
      roleId: 6,
    }
  });

  if (!manager) { Customize.errorMessage(req, res, 'Unknown line manager', 404); }
  next();
};

export default isManager;