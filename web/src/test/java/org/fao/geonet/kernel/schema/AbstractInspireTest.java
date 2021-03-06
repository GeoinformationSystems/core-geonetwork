package org.fao.geonet.kernel.schema;

import org.fao.geonet.utils.Xml;
import org.jdom.Element;
import org.junit.Test;

import java.io.File;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

/**
 * Test the inspire schematron.
 *
 * Created by Jesse on 1/31/14.
 */
public abstract class AbstractInspireTest extends AbstractSchematronTest {
    protected static final String INSPIRE_VALID_ISO19139_XML = "inspire-valid-iso19139.xml";

    protected abstract File getSchematronXsl();


    @Test
    public void testValid() throws Exception {
        final Element validMetadata = Xml.loadStream(AbstractInspireTest.class.getResourceAsStream(INSPIRE_VALID_ISO19139_XML));

        Element results = Xml.transform(validMetadata, getSchematronXsl().getPath(), params);
        assertEquals(0, countFailures(results));
    }

}
