// Instantiate router - DO NOT MODIFY
const express = require('express');
const router = express.Router();

// Import model(s)
const { Student } = require('../db/models');
const { Op } = require("sequelize");

// List
// get /students
router.get('/', async (req, res, next) => {
    let errorResult = { errors: [], count: 0, pageCount: 0 };
    
    try {

        const where = {}; // define the where clause
        let result = {}; // define the result object that will be returned as the json resp

        // firstName filter
        if (req.query.firstName) {
            where.firstName = {
                [Op.like]: `%${req.query.firstName}%` // This ensures that any string containing the pattern will match
            };
        }
        //lastName filter
        if (req.query.lastName) {
            where.lastName = {
                [Op.like]: `%${req.query.lastName}%` // This ensures that any string containing the pattern will match
            };
        }
        // Filtering by leftHanded
        if (req.query.lefty) {
            if (req.query.lefty === 'true') {
                where.leftHanded = true;
            } else if (req.query.lefty === 'false') {
                where.leftHanded = false;
            } else {
                errorResult.errors.push('Lefty should be either true or false');
                return res.status(400).json(errorResult);
            }
        }
        
        // pagination and set default values
        let page = parseInt(req.query.page) || 1;
        let size = parseInt(req.query.size) || 10;

        // Special case to return all students (page=0, size=0) or page and size params are not provided
        if (!req.query.page || page === 0 || !req.query.size || size === 0) {
            result.rows = await Student.findAll({
                attributes: ['id', 'firstName', 'lastName', 'leftHanded'],
                where: where,
                order: [['lastName','ASC'], ['firstName','ASC']]
            });
            result.page = 1;
            return res.json(result);
        }   
        
        // Check if page and size are valid numbers and within the expected range
        if (isNaN(page) || page < 0 || isNaN(size) || size > 200) {
            errorResult.errors.push('Requires valid page and size params');
            return res.status(400).json(errorResult);
        }

        //Calculate limit and offset
        const offset = (page - 1) * size;
     
        // update the result object accordingy
        const totalStudentCount = await Student.count({ where: where }); // get total student count based on the where clause provided (example: all students where lefthanded is true)
        result.count = totalStudentCount;

        result.rows = await Student.findAll({
            attributes: ['id', 'firstName', 'lastName', 'leftHanded'],
            where: where,
            order: [['lastName','ASC'], ['firstName','ASC']],
            limit: size,
            offset: offset
        });

        result.page = page;
        result.pageCount = Math.ceil(totalStudentCount / size);

        // return the results in JSON format
        return res.json(result);

    } catch (error) {
        next(error);
    }
});

// Export class - DO NOT MODIFY
module.exports = router;