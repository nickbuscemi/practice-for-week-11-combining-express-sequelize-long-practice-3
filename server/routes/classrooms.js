// Instantiate router - DO NOT MODIFY
const express = require('express');
const router = express.Router();

// Import model(s)
const { Classroom, Supply, Student, StudentClassroom, sequelize } = require('../db/models');
const { Sequelize } = require('sequelize');
const { Op } = require('sequelize');

// List of classrooms
router.get('/', async (req, res, next) => {
    let errorResult = { errors: [], count: 0, pageCount: 0 };

    // Phase 6B: Classroom Search Filters
    /*
        name filter:
            If the name query parameter exists, set the name query
                filter to find a similar match to the name query parameter.
            For example, if name query parameter is 'Ms.', then the
                query should match with classrooms whose name includes 'Ms.'

        studentLimit filter:
            If the studentLimit query parameter includes a comma
                And if the studentLimit query parameter is two numbers separated
                    by a comma, set the studentLimit query filter to be between
                    the first number (min) and the second number (max)
                But if the studentLimit query parameter is NOT two integers
                    separated by a comma, or if min is greater than max, add an
                    error message of 'Student Limit should be two integers:
                    min,max' to errorResult.errors
            If the studentLimit query parameter has no commas
                And if the studentLimit query parameter is a single integer, set
                    the studentLimit query parameter to equal the number
                But if the studentLimit query parameter is NOT an integer, add
                    an error message of 'Student Limit should be a integer' to
                    errorResult.errors 
    */
    const where = {};

    // Your code here

    const classrooms = await Classroom.findAll({
        attributes: [ 'id', 'name', 'studentLimit' ],
        where,
        // Phase 1B: Order the Classroom search results
        order: [['name','ASC']],
    });

    res.json(classrooms);
});

// Single classroom
router.get('/:id', async (req, res, next) => {
    let classroom = await Classroom.findByPk(req.params.id, {
        attributes: ['id', 'name', 'studentLimit'],
        
        include: [
            {
                model: Supply,
                as: 'supplies',
                attributes: ['name','category','handed'],
                order: [['category','ASC'], ['name','ASC']]
            },
            {
                model: Student,
                as: 'students',
                attributes: ['id', 'firstName', 'lastName'],
                through: { attributes: [] },
                order: [['lastName','ASC'],['firstName','ASC']]
            }
        ],
        
    });

    if (!classroom) {
        res.status(404);
        res.send({ message: 'Classroom Not Found' });
    }

    // Calculate the average student grade for this classroom
    const avgGradeResult = await StudentClassroom.findAll({
        attributes: [[Sequelize.fn('ROUND', Sequelize.fn('AVG', Sequelize.col('grade')), 2), 'avgGrade']],
        where: { classroomId: req.params.id },
        raw: true
    });

    const avgGrade = avgGradeResult[0].avgGrade;

    classroom = classroom.toJSON();
    
    // Set the supplyCount property onto the POJO
    classroom.supplyCount = classroom.supplies.length;
    classroom.studentCount = classroom.students.length;
    classroom.avgGrade = avgGrade;

    // You can delete the supplies property if you don't want to send the list of supplies in the response
    delete classroom.supplies;
    delete classroom.students;
    
    // check if class is overloaded
    if (classroom.studentLimit < classroom.studentCount) { 
        classroom.overloaded = true;
    } else {
        classroom.overloaded = false;
    }

    res.json(classroom);
});

// Export class - DO NOT MODIFY
module.exports = router;