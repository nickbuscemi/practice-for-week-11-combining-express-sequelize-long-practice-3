// Instantiate router - DO NOT MODIFY
const express = require('express');
const router = express.Router();

// Import model(s)
const { Classroom, Supply, Student, StudentClassroom } = require('../db/models');
const { Sequelize } = require('sequelize');
const { Op } = require('sequelize');

// List of classrooms
router.get('/', async (req, res, next) => {
    let errorResult = { errors: [], count: 0, pageCount: 0 };

    const where = {};

    // filter classrooms by teacher name
    if (req.query.name) {
        where.name = {
            [Op.like]: `%${req.query.name}%`
        }
    };
    // filter classrooms by a range of student limit
    if (req.query.studentLimit && req.query.studentLimit.includes(',')) { //
        const [min, max] = req.query.studentLimit.split(',').map(Number);
        if (!isNaN(min) && !isNaN(max) && min <= max) {
            where.studentLimit = {
                [Op.between]: [min, max]
            };
        } else {
            errorResult.errors.push('Student limit should be two numbers: min, max')
        }
    // filter classrooms by an exact student limit    
    } else if (req.query.studentLimit) {
        const exactLimit = parseInt(req.query.studentLimit);
        if (!isNaN(exactLimit)) {
            where.studentLimit = exactLimit;
        } else {
            errorResult.errors.push('Student limit should be an integer')
        }
    } ;

    const classrooms = await Classroom.findAll({
        attributes: [ 'id', 'name', 'studentLimit' ],
        where,
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
                attributes: ['id', 'firstName', 'lastName', 'leftHanded'],
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
        attributes: [[Sequelize.fn('ROUND', Sequelize.fn('AVG', Sequelize.col('grade')), 2), 'avgGrade']], // will find the average off all numbers in the grade column WHERE the clssroom id matched that parameters to the nearest hundredth
        where: { classroomId: req.params.id },
        raw: true
    });

    // only use the key not the whole object
    const avgGrade = avgGradeResult[0].avgGrade;

    classroom = classroom.toJSON();
    
    // Set the supplyCount, studentCount, avgGrade property onto the POJO
    classroom.supplyCount = classroom.supplies.length;
    classroom.studentCount = classroom.students.length;
    classroom.avgGrade = avgGrade;

    // You can delete the supplies property if you don't want to send the list of supplies in the response (toggle delete on or off depending on whether you want to show students or supplies)
    //delete classroom.supplies;
    //delete classroom.students;
    
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