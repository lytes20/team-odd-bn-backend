import dotenv from 'dotenv';
import CommonQueries from './CommonQueries';
import {
  tripRequests,
  status,
  notifications,
  users,
  userProfile,
  rooms,
  accommodations,
  booking,
  sequelize
} from '../database/models';
import { notificationEvents, sendNotification } from '../helpers/notificationConfig';

dotenv.config();

/**
 * @exports
 * @class NotificationService
 */
class NotificationService {
  /**
   * generate notification
   * @static
   * @param {object} req request object
   * @param {object} reason why to approve or reject
   * @memberof NotificationService
   * @returns {object} data
   */
  static async ApprovedOrRejectedTripNotification(req, reason) {
    const { tripRequestId } = req.params;

    const userTripsRequestsObject = {
      where: { id: tripRequestId }
    };
    const tripRequestInfo = await CommonQueries.findOne(tripRequests, userTripsRequestsObject);
    const { userId, statusId, updatedAt } = tripRequestInfo.dataValues;
    const tripStatus = await CommonQueries.findOne(status, { where: { id: statusId } });
    const { status: statusName } = tripStatus.dataValues;
    const message = `your trip request has been ${statusName.toLowerCase()}`;

    const result = await NotificationService.saveNotification({
      userId,
      tripRequestId,
      message
    });

    const data = {
      notificationId: result.dataValues.id,
      tripRequestId,
      reason,
      updatedAt
    };
    notificationEvents('approve_reject_notification', { message, data });
    sendNotification(req.io, 'approve_reject_notification', req.connectedClients, result);
  }

  /**
   * generate notification
   * @static
   * @param {object} dataNotification pass object to save in Table
   * @memberof NotificationService
   * @returns {object} data
   */
  static async saveNotification(dataNotification) {
    const data = await CommonQueries.create(notifications, dataNotification);
    return data;
  }

  /**
   * Send notification to manager when trip edited
   * @static
   * @param {object} req get user information
   * @memberof NotificationService
   * @returns {object} data
   */
  static async editedTripNotification(req) {
    const { params, user } = req;
    const managerById = {
      where: { userId: user.id }
    };

    const userTripsRequestsObject = {
      where: { id: params.tripRequestId }
    };

    const tripRequestInfo = await CommonQueries.findOne(tripRequests, userTripsRequestsObject);
    const userProfileInfo = await CommonQueries.findOne(userProfile, managerById);
    const { managerId } = userProfileInfo.dataValues;
    const { updatedAt } = tripRequestInfo.dataValues;
    const message = `Trip request no ${params.tripRequestId} has been edited`;

    const result = await NotificationService.saveNotification({
      userId: managerId,
      tripRequestId: params.tripRequestId,
      message
    });

    const data = {
      notificationId: result.dataValues.id,
      tripRequestId: params.tripRequestId,
      updatedAt
    };
    notificationEvents('edit_trip_notification', { message, data });
    sendNotification(req.io, 'edit_trip_notification', req.connectedClients, result);
  }

  /**
   * Send notification to a user or manager when post added
   * @static
   * @param {object} req get user information
   * @memberof NotificationService
   * @returns {object} data
   */
  static async addCommentNotification(req) {
    const { user, params } = req;
    const tripRequestInfoObject = {
      where: {
        id: params.tripRequestId
      }
    };

    const tripRequestInfo = await CommonQueries.findOne(tripRequests, tripRequestInfoObject);
    const { userId } = tripRequestInfo;
    const lineManagerIdObject = {
      where: {
        userId
      }
    };
    const userProfileInfo = await CommonQueries.findOne(userProfile, lineManagerIdObject);
    const { managerId } = userProfileInfo.dataValues;
    const message = `The Trip request no ${params.tripRequestId} has been commented on`;
    let receiverId;

    if (userId === user.id) {
      receiverId = managerId; 
    } else {
      receiverId = userId; 
    }

    const result = await NotificationService.saveNotification({
      userId: receiverId,
      tripRequestId: params.tripRequestId,
      message
    });

    const data = {
      notificationId: result.dataValues.id,
      tripRequestId: params.tripRequestId,
      updatedAt: result.dataValues.updatedAt
    };
    notificationEvents('post_comment_notification', { data });
    sendNotification(req.io, 'post_comment_notification', req.connectedClients, result);
  }

  /**
   * generate notification
   * @static
   * @param {object} req request object
   * @memberof NotificationService
   * @returns {object} data
   */
  static async newTripRequestNotification(req) {
    const managerIdqueryObject = {
      where: { userId: req.user.id },
      include: [{
        model: users,
        as: 'user'
      }],
      raw: true
    };
    const tripUser = await CommonQueries.findAll(userProfile, managerIdqueryObject);
    const message = `${tripUser[0]['user.firstName']} ${tripUser[0]['user.lastName']} has made an new travel request`;
    const newNotification = await NotificationService.saveNotification({
      userId: tripUser[0].managerId,
      message,
      tripRequestId: req.result.id
    });
    const { bookingId, updatedAt, ...data } = newNotification.dataValues;
    data.managerId = tripUser[0].managerId;
    notificationEvents('trip_request_notification', { data });
    sendNotification(req.io, 'trip_request_notification', req.connectedClients, data);
  }


  /**
   * generate notification
   * @static
   * @param {object} req request object
   * @memberof NotificationService
   * @returns {object} data
   */
  static async newBookingNotification(req) {
    const userQueryObject = {
      where: { id: req.user.id }
    };
    const travelAdminQueryObject = {
      where: { id: req.result.id },
      attributes: [],
      include: [{
        model: rooms,
        include: [{
          model: accommodations,
          attributes: ['userId'],
        }],
        attributes: ['name'],
      }],
      raw: true
    };
    const user = await CommonQueries.findAll(users, userQueryObject);
    const accommodation = await CommonQueries.findAll(booking, travelAdminQueryObject);
    const message = `${user[0].firstName} ${user[0].lastName} has booked room ${accommodation[0]['room.name']} `;
    const newNotification = await NotificationService.saveNotification({
      message,
      userId: req.user.id,
      bookingId: req.result.id
    });
    const { tripRequestId, updatedAt, ...data } = newNotification.dataValues;
    data.travelAdminId = accommodation[0]['room.accommodation.userId'];

    notificationEvents('booking_notification', { data });
    sendNotification(req.io, 'booking_notification', req.connectedClients, data);
  }

  /**
   * Mark notification as read
   * @static
   * @param {array} notificationsArrayIds pass object to save in Table
   * @memberof NotificationService
   * @returns {object} data
   */
  static async markNotificationAsRead(notificationsArrayIds) {
    await sequelize.transaction(async () => {
      notificationsArrayIds.map(async (notificationId) => {
        const markReadNotificationQueryObject = [
          { markRead: true },
          {
            where: { id: notificationId }
          }
        ];
        await CommonQueries.update(notifications, markReadNotificationQueryObject);
      });
    });
  }

  /**
  * User can view his/her notification
  * @description GET /api/v1/users/notification
  * @static
  * @param {object} req request object
  * @returns {object} NotificationService
  */
  static async viewNotification(req) {
    const { id } = req.user;
    const findAllNotificationObject = {
      where: {
        userId: id
      },
      order: [
        ['id', 'DESC'],
      ],
    };
    const result = await CommonQueries.findAll(notifications, findAllNotificationObject);

    if (result.length === 0) {
      return 'no new notification';
    }
    return result;
  }
}

export default NotificationService;
