//Please replace httpServer with the correct address for your testing server or an environment variable
const httpServer = 'http://192.168.50.10:8080';
//const httpServer = 'https://scribeocr.com/';

describe('It downloads a', () => {
  beforeEach(() => {
    cy.visit(httpServer);
    cy.get('#nav-import-tab').click();
  })

  //JPG Upload -> Download 

  it('text file from jpg with hOCR', () => {
    cy.get('#uploader').selectFile([
      'cypress/fixtures/multi_jpg/henreys_grave.hocr',
      'cypress/fixtures/multi_jpg/henreys_grave.jpg'
    ])
    cy.get('#pageCount').should('have.text', '1')
    cy.wait(500)
    cy.get('#nav-download-tab').click()
    cy.get('#downloadFormat').click()
    cy.get('#formatLabelOptionText').click()
    cy.get('#save2').click()
    cy.verifyDownload('henreys_grave', {contains: true})
    
  })
  
  it('text file from 4 jpgs with 4 hOCRs', () => {
    cy.get('#uploader').selectFile([
      'cypress/fixtures/snow_drops.xml', 
      'cypress/fixtures/snow_drops.jpg',
      'cypress/fixtures/multi_jpg/aurelia_jpg.hocr',
      'cypress/fixtures/multi_jpg/aurelia.jpg',
      'cypress/fixtures/multi_jpg/henreys_grave.hocr',
      'cypress/fixtures/multi_jpg/henreys_grave.jpg',
      'cypress/fixtures/multi_jpg/the_past.hocr',
      'cypress/fixtures/multi_jpg/the_past.jpg'
    ])
    cy.get('#pageCount').should('have.text', '4')
    cy.get('#nav-download-tab').click()
    cy.get('#downloadFormat').click()
    cy.get('#formatLabelOptionText').click()
    cy.get('#save2').click()
    cy.verifyDownload('snow_drops.txt', {contains: true})
    
  }) 

  it('pdf file from jpg with hOCR', () => {
    cy.get('#uploader').selectFile([
      'cypress/fixtures/multi_jpg/the_past.hocr',
      'cypress/fixtures/multi_jpg/the_past.jpg'
    ])
    cy.get('#pageCount').should('have.text', '1')
    cy.wait(3000)
    cy.get('#nav-download-tab').click()
    cy.get('#downloadFormat').click()
    cy.get('#formatLabelOptionPDF').click()
    cy.get('#save2').click()
    cy.verifyDownload('snow_drops.pdf', {contains: true})
    
  })
  
  it('pdf file from 4 jpgs with 4 hOCRs', () => {
    cy.get('#uploader').selectFile([
      'cypress/fixtures/snow_drops.xml', 
      'cypress/fixtures/snow_drops.jpg',
      'cypress/fixtures/multi_jpg/aurelia_jpg.hocr',
      'cypress/fixtures/multi_jpg/aurelia.jpg',
      'cypress/fixtures/multi_jpg/henreys_grave.hocr',
      'cypress/fixtures/multi_jpg/henreys_grave.jpg',
      'cypress/fixtures/multi_jpg/the_past.hocr',
      'cypress/fixtures/multi_jpg/the_past.jpg'
    ])
    cy.get('#pageCount').should('have.text', '4')
    cy.wait(3000)
    cy.get('#nav-download-tab').click()
    cy.get('#downloadFormat').click()
    cy.get('#formatLabelOptionPDF').click()
    cy.get('#save2').click()
    cy.verifyDownload('snow_drops.pdf', {contains: true})
    
  }) 

  it('hocr file from jpg)', () => {
    cy.get('#uploader').selectFile([
      'cypress/fixtures/multi_jpg/aurelia_jpg.hocr',
      'cypress/fixtures/multi_jpg/aurelia.jpg',
    ])
    cy.get('#pageCount').should('have.text', '1')
    cy.wait(3000)
    cy.get('#nav-download-tab').click()
    cy.get('#downloadFormat').click()
    cy.get('#formatLabelOptionHOCR').click()
    cy.get('#save2').click()
    cy.verifyDownload('aurelia_jpg.hocr', {contains: true})

  })

  it('hocr file from 4 jpgs)', () => {
    cy.get('#uploader').selectFile([
      'cypress/fixtures/snow_drops.xml', 
      'cypress/fixtures/snow_drops.jpg',
      'cypress/fixtures/multi_jpg/aurelia_jpg.hocr',
      'cypress/fixtures/multi_jpg/aurelia.jpg',
      'cypress/fixtures/multi_jpg/henreys_grave.hocr',
      'cypress/fixtures/multi_jpg/henreys_grave.jpg',
      'cypress/fixtures/multi_jpg/the_past.hocr',
      'cypress/fixtures/multi_jpg/the_past.jpg'
    ])
    cy.get('#pageCount').should('have.text', '4')
    cy.get('#nav-download-tab').click()
    cy.get('#downloadFormat').click()
    cy.get('#formatLabelOptionHOCR').click()
    cy.get('#save2').click()
    cy.verifyDownload('snow_drops.hocr', {contains: true})
    
  }) 

  // PDF Upload -> Download 

  it('text file from a pdf with different page numbered xml', () => {
    cy.get('#uploader').selectFile(
      ['cypress/fixtures/siegeofcorinthpo00byrorich_abbyy.xml', 
        'cypress/fixtures/siegeofcorinthpo00byrorich_bw.pdf'
    ])
    cy.get('#pageCount').should('have.text', '118')
    cy.wait(5000)
    cy.get('#nav-download-tab').click()
    cy.get('#downloadFormat').click()
    cy.get('#formatLabelOptionText').click()
    cy.wait(5000)
    cy.get('#save2').click()
    cy.verifyDownload('siegeofcorinthpo00byrorich_bw.txt')
  })
  /* 
  it('downloads a pdf file from a pdf with different page numbered xml', () => {
    cy.get('#uploader').selectFile(
      ['cypress/fixtures/siegeofcorinthpo00byrorich_abbyy.xml', 'cypress/fixtures/siegeofcorinthpo00byrorich_bw.pdf'])
    cy.get('#pageCount').should('have.text', '118')
    cy.get('#nav-download-tab').click()
    cy.get('#downloadFormat').click()
    cy.get('#formatLabelOptionPDF').click()
    cy.get('#save2').click()
    cy.wait(20000)
    cy.verifyDownload('siegeofcorinthpo00byrorich_bw.pdf', {contains: true})
  })
  it('downloads a hocr file from a pdf with different page numbered xml', () => {
    cy.get('#uploader').selectFile(
      ['cypress/fixtures/siegeofcorinthpo00byrorich_abbyy.xml', 'cypress/fixtures/siegeofcorinthpo00byrorich_bw.pdf'])
    cy.get('#pageCount').should('have.text', '118')
    cy.get('#nav-download-tab').click()
    cy.get('#downloadFormat').click()
    cy.get('#formatLabelOptionHOCR').click()
    cy.get('#save2').click()
    cy.wait(20000)
    cy.verifyDownload('siegeofcorinthpo00byrorich_bw.hocr', {contains: true})
  })
  */

  // PNG Upload -> Download 

  it('text file from a png with hOCR', () => {
    cy.get('#uploader').selectFile(['cypress/fixtures/pretty_faces.xml', 'cypress/fixtures/pretty_faces.png'])
    cy.get('#pageCount').should('have.text', '1')
    cy.wait(100)
    cy.get('#nav-download-tab').click()
    cy.get('#downloadFormat').click()
    cy.get('#formatLabelOptionText').click()
    cy.get('#save2').click()
    cy.verifyDownload('pretty_faces.txt', {contains: true})
  })

  it('text file from 4 pngs with 4 hOCRs', () => {
    cy.get('#uploader').selectFile([
      'cypress/fixtures/pretty_faces.xml', 
      'cypress/fixtures/pretty_faces.png', 
      'cypress/fixtures/multi_png/aurelia_png.hocr', 
      'cypress/fixtures/multi_png/aurelia.png', 
      'cypress/fixtures/multi_png/henreys_grave_png.hocr', 
      'cypress/fixtures/multi_png/henreys_grave.png', 
      'cypress/fixtures/multi_png/the_past_png.hocr', 
      'cypress/fixtures/multi_png/the_past.png'])
    cy.get('#pageCount').should('have.text', '4')
    cy.get('#nav-download-tab').click()
    cy.get('#downloadFormat').click()
    cy.get('#formatLabelOptionText').click()
    cy.get('#save2').click()
    cy.verifyDownload('pretty_faces.txt', {contains: true})
  })

  it('pdf file from a png with hOCR', () => {
    cy.get('#uploader').selectFile(['cypress/fixtures/pretty_faces.xml', 'cypress/fixtures/pretty_faces.png'])
    cy.get('#pageCount').should('have.text', '1')
    cy.wait(100)
    cy.get('#nav-download-tab').click()
    cy.get('#downloadFormat').click()
    cy.get('#formatLabelOptionPDF').click()
    cy.get('#save2').click()
    cy.verifyDownload('pretty_faces.pdf', {contains: true})
  })

  it('pdf file from 4 pngs with 4 hOCRs', () => {
    cy.get('#uploader').selectFile([
      'cypress/fixtures/pretty_faces.xml', 
      'cypress/fixtures/pretty_faces.png', 
      'cypress/fixtures/multi_png/aurelia_png.hocr', 
      'cypress/fixtures/multi_png/aurelia.png', 
      'cypress/fixtures/multi_png/henreys_grave_png.hocr', 
      'cypress/fixtures/multi_png/henreys_grave.png', 
      'cypress/fixtures/multi_png/the_past_png.hocr', 
      'cypress/fixtures/multi_png/the_past.png'])
    cy.get('#pageCount').should('have.text', '4')
    cy.get('#nav-download-tab').click()
    cy.get('#downloadFormat').click()
    cy.get('#formatLabelOptionPDF').click()
    cy.get('#save2').click()
    cy.verifyDownload('pretty_faces.pdf', {contains: true})
  })

  it('hocr file from jpg)', () => {
    cy.get('#uploader').selectFile(['cypress/fixtures/pretty_faces.xml', 'cypress/fixtures/pretty_faces.png'])
    cy.get('#pageCount').should('have.text', '1')
    cy.wait(3000)
    cy.get('#nav-download-tab').click()
    cy.get('#downloadFormat').click()
    cy.get('#formatLabelOptionHOCR').click()
    cy.get('#save2').click()
    cy.verifyDownload('pretty_faces.hocr', {contains: true})

  })

  it('hocr file from 4 jpgs)', () => {
    cy.get('#uploader').selectFile([
      'cypress/fixtures/pretty_faces.xml', 
      'cypress/fixtures/pretty_faces.png', 
      'cypress/fixtures/multi_png/aurelia_png.hocr', 
      'cypress/fixtures/multi_png/aurelia.png', 
      'cypress/fixtures/multi_png/henreys_grave_png.hocr', 
      'cypress/fixtures/multi_png/henreys_grave.png', 
      'cypress/fixtures/multi_png/the_past_png.hocr', 
      'cypress/fixtures/multi_png/the_past.png'
    ])
    cy.get('#pageCount').should('have.text', '4')
    cy.get('#nav-download-tab').click()
    cy.get('#downloadFormat').click()
    cy.get('#formatLabelOptionHOCR').click()
    cy.get('#save2').click()
    cy.verifyDownload('pretty_faces.hocr', {contains: true})
    
  }) 

})