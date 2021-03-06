import { cities } from '../database/models';
import CommonQueries from './CommonQueries';

/**
 * @exports
 * @class CitiesService
 */
class CitiesService {
  /**
 * Get all cities
 * @static
 * @description GET /api/v1/all-cities
 * @param {object} req request object
 * @memberof CitiesService
 * @returns {object} data
 */
  static async getCities() {
    const queryObject = {
      attributes: ['id', 'city']
    };
    const allCities = await CommonQueries.findAll(cities, queryObject);
    return allCities;
  }
}

export default CitiesService;
