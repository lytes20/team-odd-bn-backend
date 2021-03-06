import { comments, users, userProfile } from '../database/models';
import CommonQueries from './CommonQueries';

/**
 * @exports
 * @class CommentService
 */
class CommentService {
  /**
 * users or managers can comment on a travel request
 * @static
 * @description POST /api/users/:tripRequestId/comment
 * @param {object} req request object
 * @memberof CommentService
 * @returns {object} data
 */
  static async createComment(req) {
    const { tripRequestId } = req.params;
    const { id } = req.user;
    const { comment } = req.body;
    const queryObj = {
      userId: id,
      tripRequestId,
      comment

    };
    CommonQueries.create(comments, queryObj);
    return comment;
  }

  /**
* users or managers can view comment thread
* @static
* @description GET /api/users/:tripRequestId/comments
* @param {object} req request object
* @memberof CommentService
* @returns {object} data
*/
  static async getComments(req) {
    const { tripRequestId } = req.params;
    const queryObj = {
      attributes: ['id', 'comment', 'updatedAt'],
      order: [
        ['updatedAt', 'ASC'],
      ],
      include: [
        {
          model: users,
          attributes: ['id', 'firstName', 'lastName'],
          include: [
            {
              model: userProfile,
              attributes: ['imageURL']
            }
          ]
        }
      ],
      where: {
        tripRequestId
      }
    };
    const tripComments = await CommonQueries.findAll(comments, queryObj);

    return tripComments;
  }


  /**
* users or managers can view comment thread
* @static
* @description GET /api/users/:tripRequestId/comments
* @param {object} req request object
* @memberof CommentService
* @returns {object} data
*/
  static async getSpecificComments(req) {
    const { commentId } = req.params;
    const queryObj = {
      where: {
        commentId,
      }
    };

    const specificComment = await CommonQueries.findOne(comments, queryObj);

    return specificComment;
  }


  /**
* users can delete a comment they made
* @static
* @description DELETE/api/trips/:commentId
* @param {object} req request object
* @param {object} res response object
* @memberof CommentService
* @returns {object} data
*/
  static async deleteComment(req) {
    const { commentId } = req.params;
    const queryObject = {
      where: {
        id: commentId,
      }
    };
    const deletingComment = await CommonQueries.destroy(comments, queryObject);
    return deletingComment;
  }
}
export default CommentService;
