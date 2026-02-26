
const express = require('express')
const router = express.Router()
const prisma = require('../db')

const { verifyToken } = require('../../middlewares/jwt.middleware')

const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Dostęp tylko dla super administratorów'
    })
  }
  next()
}


router.get('/', verifyToken, async (req, res) => {
  try {
    const mappings = await prisma.categoryMapping.findMany({
      include: {
        organizationalUnit: {
          select: {
            id: true,
            name: true,
            type: true,
            code: true
          }
        }
      },
      orderBy: [
        { category: 'asc' }
      ]
    })

    res.json({
      success: true,
      data: mappings
    })
  } catch (error) {
    console.error('[CategoryMapping] Error fetching category mappings:', error)
    res.status(500).json({
      success: false,
      error: 'Nie udało się pobrać mapowań kategorii'
    })
  }
})


router.get('/categories', verifyToken, async (req, res) => {
  try {
    const categories = [
      { value: 'HARDWARE', label: 'Sprzęt komputerowy' },
      { value: 'SOFTWARE', label: 'Oprogramowanie' },
      { value: 'NETWORK', label: 'Sieć i Internet' },
      { value: 'ACCOUNT', label: 'Konta użytkowników' },
      { value: 'EMAIL', label: 'Poczta email' },
      { value: 'PRINTER', label: 'Drukarki i skanery' },
      { value: 'ACCESS', label: 'Dostęp do systemów' },
      { value: 'INFRASTRUCTURE', label: 'Infrastruktura IT' },
      { value: 'OTHER', label: 'Inne' }
    ]

    res.json({
      success: true,
      data: categories
    })
  } catch (error) {
    console.error('[CategoryMapping] Error fetching categories:', error)
    res.status(500).json({
      success: false,
      error: 'Nie udało się pobrać listy kategorii'
    })
  }
})


router.get('/units', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const units = await prisma.organizationalUnit.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        code: true,
        location: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    res.json({
      success: true,
      data: units
    })
  } catch (error) {
    console.error('[CategoryMapping] Error fetching organizational units:', error)
    res.status(500).json({
      success: false,
      error: 'Nie udało się pobrać jednostek organizacyjnych'
    })
  }
})


router.post('/', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const { category, organizationalUnitId, description, isActive } = req.body

    if (!category || !organizationalUnitId) {
      return res.status(400).json({
        success: false,
        error: 'Kategoria i jednostka organizacyjna są wymagane'
      })
    }

    const existing = await prisma.categoryMapping.findUnique({
      where: {
        category_organizationalUnitId: {
          category,
          organizationalUnitId: parseInt(organizationalUnitId)
        }
      }
    })

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Mapowanie dla tej kategorii i jednostki już istnieje'
      })
    }

    const unit = await prisma.organizationalUnit.findUnique({
      where: { id: parseInt(organizationalUnitId) }
    })

    if (!unit) {
      return res.status(404).json({
        success: false,
        error: 'Jednostka organizacyjna nie istnieje'
      })
    }

    const mapping = await prisma.categoryMapping.create({
      data: {
        category,
        organizationalUnitId: parseInt(organizationalUnitId),
        description: description || null,
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        organizationalUnit: {
          select: {
            id: true,
            name: true,
            type: true,
            code: true
          }
        }
      }
    })

    res.status(201).json({
      success: true,
      data: mapping,
      message: 'Mapowanie utworzone pomyślnie'
    })
  } catch (error) {
    console.error('[CategoryMapping] Error creating category mapping:', error)
    res.status(500).json({
      success: false,
      error: 'Nie udało się utworzyć mapowania'
    })
  }
})


router.put('/:id', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params
    const { description, isActive } = req.body

    const existing = await prisma.categoryMapping.findUnique({
      where: { id: parseInt(id) }
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Mapowanie nie istnieje'
      })
    }

    const mapping = await prisma.categoryMapping.update({
      where: { id: parseInt(id) },
      data: {
        description: description !== undefined ? description : existing.description,
        isActive: isActive !== undefined ? isActive : existing.isActive
      },
      include: {
        organizationalUnit: {
          select: {
            id: true,
            name: true,
            type: true,
            code: true
          }
        }
      }
    })

    res.json({
      success: true,
      data: mapping,
      message: 'Mapowanie zaktualizowane pomyślnie'
    })
  } catch (error) {
    console.error('[CategoryMapping] Error updating category mapping:', error)
    res.status(500).json({
      success: false,
      error: 'Nie udało się zaktualizować mapowania'
    })
  }
})


router.delete('/:id', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params

    const existing = await prisma.categoryMapping.findUnique({
      where: { id: parseInt(id) }
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Mapowanie nie istnieje'
      })
    }

    await prisma.categoryMapping.delete({
      where: { id: parseInt(id) }
    })

    res.json({
      success: true,
      message: 'Mapowanie usunięte pomyślnie'
    })
  } catch (error) {
    console.error('[CategoryMapping] Error deleting category mapping:', error)
    res.status(500).json({
      success: false,
      error: 'Nie udało się usunąć mapowania'
    })
  }
})

module.exports = router
