// Instantiate router - DO NOT MODIFY
const express = require('express');
const router = express.Router();

// Import model(s)
const { Supply, Classroom, Student, StudentClassroom } = require('../db/models');
const { Sequelize } = require('sequelize');

// List of supplies by category
router.get('/category/:categoryName', async (req, res, next) => {
    
    try {
        const supplies = await Supply.findAll({
            where: {
                category: req.params.categoryName
            },
            include: [{
                model: Classroom,
                attributes: ['id', 'name']
            }],
            order: [
                [Sequelize.literal("SUBSTRING(classroom.name, INSTR(classroom.name, ' '))"), 'ASC'], // orders by last name alphebetically by skipping the prefix mr or ms
                ['name','ASC'],
                ['handed','ASC']
            ]
        });
        res.json(supplies);

    } catch (error) {
        next(error);
    }
});


// Scissors Supply Calculation - Business Logic Goes Here!
router.get('/scissors/calculate', async (req, res, next) => {
    let result = {};

    const scissorCount = await Supply.findAll({
        where: {
            name: 'Safety Scissors'
        },
        attributes : ['handed', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
        group: ['handed'],
        raw: true
    });


    let numRightyScissors = 0;
    let numLeftyScissors = 0;

    for (let scissor of scissorCount) {
        if (scissor.handed === 'right') {
            numRightyScissors += scissor.count;
        } else {
            numLeftyScissors += scissor.count;
        }
    }

    result.numRightyScissors = numRightyScissors;
    result.numLeftyScissors = numLeftyScissors;
    result.totalNumScissorss = numRightyScissors + numLeftyScissors
    
    const leftHandedStudents = await StudentClassroom.count({
        include: {
            model: Student,
            where: { leftHanded: true }
        }
    });
    
    const rightHandedStudents = await StudentClassroom.count({
        include: {
            model: Student,
            where: { leftHanded: false }
        }
    });
    
    result.numRightHandedStudents = rightHandedStudents
    result.numLeftHandedStudents = leftHandedStudents
    
    result.numRightyScissorsStillNeeded = result.numRightHandedStudents - result.numRightyScissors;
    result.numLeftyScissorsStillNeeded = result.numLeftHandedStudents - result.numLeftyScissors;


    res.json(result);
});

// Export class - DO NOT MODIFY
module.exports = router;